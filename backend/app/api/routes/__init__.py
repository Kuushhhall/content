from fastapi import APIRouter

from app.api.routes import articles, drafts, health, publish

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(articles.router)
api_router.include_router(drafts.router)
api_router.include_router(publish.router)
