import logging
import sys
from contextlib import asynccontextmanager
from pathlib import Path

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import api_router
from app.api.ws import register_ws_routes
from app.core.config import get_settings
from app.platforms import framer as framer_pub
from app.state.store import StateStore

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(name)-20s | %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(Path(__file__).parent.parent / "data" / "app.log"),
    ],
)
log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    store = StateStore(settings.state_path)
    app.state.store = store
    app.state.settings = settings

    log.info("App started. State: %d articles, %d drafts, %d schedules",
             len(store.list_articles()), len(store.list_drafts()), len(store.list_schedules()))

    # Background tasks
    import asyncio
    cleanup_task = asyncio.create_task(_auto_cleanup(store))
    scheduler_task = asyncio.create_task(_schedule_checker(store, settings))

    yield

    log.info("Shutting down...")
    cleanup_task.cancel()
    scheduler_task.cancel()
    try:
        await cleanup_task
    except asyncio.CancelledError:
        pass
    try:
        await scheduler_task
    except asyncio.CancelledError:
        pass


async def _auto_cleanup(store: StateStore) -> None:
    """Delete articles older than 1 day every hour."""
    import asyncio
    while True:
        try:
            old = store.list_articles_older_than(1)
            if old:
                for a in old:
                    store.delete_article(a.id)
                log.info("Cleaned up %d old articles", len(old))
        except Exception as e:
            log.error("Cleanup error: %s", e)
        await asyncio.sleep(3600)


async def _schedule_checker(store: StateStore, settings) -> None:
    """Check every 60 seconds for pending schedules that are due and publish them."""
    import asyncio
    from datetime import UTC, datetime

    log.info("Background schedule checker started (runs every 60s)")
    while True:
        try:
            pending = store.get_pending_schedules()
            for sched in pending:
                draft = store.get_draft(sched.draft_id)
                if not draft:
                    log.warning("Schedule %s: draft %s not found, marking failed", sched.id, sched.draft_id)
                    sched.status = "failed"
                    sched.error = "Draft not found"
                    store.upsert_schedule(sched)
                    continue

                log.info("Schedule %s: publishing draft %s to %s", sched.id, sched.draft_id, sched.platform)
                sched.status = "running"
                store.upsert_schedule(sched)

                if sched.platform == "framer":
                    result = framer_pub.publish(draft, settings, as_draft=False)
                    store.append_publish_result(result)
                    if result.success:
                        sched.status = "completed"
                        log.info("Schedule %s: published successfully to Framer", sched.id)
                    else:
                        sched.status = "failed"
                        sched.error = result.message or "Unknown error"
                        log.warning("Schedule %s: publish failed: %s", sched.id, result.message)
                else:
                    # LinkedIn/X - can't auto-publish without credentials
                    sched.status = "completed"
                    log.info("Schedule %s: %s draft marked complete (manual publish required)",
                             sched.id, sched.platform)

                store.upsert_schedule(sched)

        except Exception as e:
            log.error("Schedule checker error: %s", e)

        await asyncio.sleep(60)


def create_app() -> FastAPI:
    settings = get_settings()
    log.info("Creating app: %s (debug=%s)", settings.app_name, settings.debug)

    app = FastAPI(title=settings.app_name, lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_router, prefix="/api")
    register_ws_routes(app)

    log.info("Routes registered:")
    for route in app.routes:
        if hasattr(route, "methods"):
            log.info("  %s %s", route.methods, route.path)
        elif hasattr(route, "path"):
            log.info("  WS   %s", route.path)

    return app


app = create_app()

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
