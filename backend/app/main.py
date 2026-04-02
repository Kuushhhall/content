from contextlib import asynccontextmanager
import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import api_router
from app.api.ws import register_ws_routes
from app.core.config import get_settings
from app.state.store import StateStore


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    store = StateStore(settings.state_path)
    app.state.store = store
    app.state.settings = settings

    cleanup_task = asyncio.create_task(auto_cleanup(store))
    yield
    cleanup_task.cancel()
    try:
        await cleanup_task
    except asyncio.CancelledError:
        pass


async def auto_cleanup(store: StateStore) -> None:
    while True:
        try:
            old_articles = store.list_articles_older_than(1)
            for a in old_articles:
                store.delete_article(a.id)
        except Exception as e:
            print(f"Cleanup error: {e}")
        await asyncio.sleep(3600)


def create_app() -> FastAPI:
    settings = get_settings()
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
    return app


app = create_app()
