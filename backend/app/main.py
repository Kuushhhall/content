from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI

from app.api.routes import api_router
from app.api.ws import register_ws_routes
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.scheduler.jobs import build_scheduler
from app.state.store import StateStore


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    configure_logging(settings.debug)
    store = StateStore(settings.state_path)
    app.state.store = store
    app.state.settings = settings

    def get_store() -> StateStore:
        return app.state.store

    scheduler: AsyncIOScheduler = build_scheduler(settings, get_store)
    scheduler.start()
    app.state.scheduler = scheduler
    yield
    scheduler.shutdown(wait=False)


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        lifespan=lifespan,
    )
    app.include_router(api_router, prefix="/api")
    register_ws_routes(app)
    return app


app = create_app()
