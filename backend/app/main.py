from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import api_router
from app.api.ws import register_ws_routes
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.database import init_database, close_database, get_database
from app.scheduler.jobs import build_scheduler
from app.state.store import StateStore


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    configure_logging(settings.debug)
    
    # Initialize database if configured
    db = await init_database(settings)
    app.state.db = db
    
    # Initialize state store (fallback to JSON if no DB)
    store = StateStore(settings.state_path)
    app.state.store = store
    app.state.settings = settings

    def get_store() -> StateStore:
        return app.state.store

    scheduler: AsyncIOScheduler = build_scheduler(settings, get_store)
    scheduler.start()
    app.state.scheduler = scheduler
    yield
    
    # Cleanup
    scheduler.shutdown(wait=False)
    await close_database()


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
