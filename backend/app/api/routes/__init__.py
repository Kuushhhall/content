from fastapi import APIRouter

from app.api.routes import analytics, articles, drafts, engagement, health, publish

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(articles.router)
api_router.include_router(drafts.router)
api_router.include_router(publish.router)
api_router.include_router(engagement.router)
api_router.include_router(analytics.router)
