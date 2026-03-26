import asyncio
from datetime import UTC, datetime

from fastapi import FastAPI, WebSocket, WebSocketDisconnect

from app.database import get_database
from app.repositories.articles import ArticleRepository
from app.repositories.drafts import DraftRepository


def register_ws_routes(app: FastAPI) -> None:
    @app.websocket("/ws/status")
    async def ws_status(websocket: WebSocket) -> None:
        await websocket.accept()
        try:
            while True:
                store = app.state.store
                db = get_database()
                
                # Get counts from database if available, otherwise fall back to in-memory store
                if db:
                    async with db.session() as session:
                        article_repo = ArticleRepository(session)
                        draft_repo = DraftRepository(session)
                        
                        # Get total counts from database
                        _, articles_count = await article_repo.list_articles(limit=1)
                        _, drafts_count = await draft_repo.list_drafts(limit=1)
                else:
                    # Fall back to in-memory store
                    articles_count = len(store.list_articles())
                    drafts_count = len(store.list_drafts())
                
                payload = {
                    "at": datetime.now(UTC).isoformat(),
                    "articles": articles_count,
                    "drafts": drafts_count,
                    "pendingSchedules": len(store.list_schedules(status="pending")),
                    "recentPublishes": len(store.recent_publish_results(limit=20)),
                    "autoReplyEnabled": store.get_auto_reply_enabled(),
                    "pipelineMode": store.get_pipeline_mode(),
                    "pipelineRunning": store.current_pipeline_run() is not None,
                }
                await websocket.send_json(payload)
                await asyncio.sleep(2)
        except WebSocketDisconnect:
            return
