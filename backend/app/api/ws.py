import asyncio
from datetime import UTC, datetime

from fastapi import FastAPI, WebSocket, WebSocketDisconnect



def register_ws_routes(app: FastAPI) -> None:
    @app.websocket("/ws/status")
    async def ws_status(websocket: WebSocket) -> None:
        await websocket.accept()
        try:
            while True:
                store = app.state.store

                # Get counts from in-memory store
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
