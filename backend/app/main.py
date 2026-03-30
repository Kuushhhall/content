from contextlib import asynccontextmanager
import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import api_router
from app.api.ws import register_ws_routes
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.state.store import StateStore


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    configure_logging(settings.debug)

    # Initialize state store (in-memory with JSON persistence)
    store = StateStore(settings.state_path)
    app.state.store = store
    app.state.settings = settings

    # Immediate startup cleanup: remove articles older than 24 hours
    _cleanup_old_articles_sync(store)

    # Start periodic auto-cleanup background task (every hour)
    cleanup_task = asyncio.create_task(auto_cleanup_old_articles(store, settings))

    yield

    # Cleanup
    cleanup_task.cancel()
    try:
        await cleanup_task
    except asyncio.CancelledError:
        pass


def _cleanup_old_articles_sync(store: StateStore) -> None:
    """Synchronous startup cleanup of articles older than 24 hours."""
    try:
        old_articles = store.list_articles_older_than(1)
        deleted = sum(1 for a in old_articles if store.delete_article(a.id))
        if deleted:
            print(f"Startup cleanup: deleted {deleted} articles older than 24h")
    except Exception as e:
        print(f"Startup cleanup error: {e}")


async def auto_cleanup_old_articles(store: StateStore, settings) -> None:
    """Background task to clean up articles older than 24 hours."""
    while True:
        try:
            # Clean up articles older than 1 day (24 hours)
            old_articles = store.list_articles_older_than(1)
            deleted_count = 0
            
            for article in old_articles:
                if store.delete_article(article.id):
                    deleted_count += 1
            
            if deleted_count > 0:
                print(f"Auto-cleanup: Deleted {deleted_count} old articles")
                
        except Exception as e:
            print(f"Auto-cleanup error: {e}")
        
        # Wait 1 hour before next cleanup
        await asyncio.sleep(3600)  # 3600 seconds = 1 hour


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(api_router, prefix="/api")
    register_ws_routes(app)
    return app


app = create_app()
