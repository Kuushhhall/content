from fastapi import APIRouter

from app.api.routes import articles, costs, drafts, health, publish
from app.api.routes.automation import router as automation_router

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(articles.router)
api_router.include_router(drafts.router)
api_router.include_router(publish.router)
api_router.include_router(costs.router)
api_router.include_router(automation_router)
