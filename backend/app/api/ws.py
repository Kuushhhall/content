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

                # Get current pipeline run with full step details
                current_run = store.current_pipeline_run()

                payload = {
                    "at": datetime.now(UTC).isoformat(),
                    "articles": len(store.list_articles()),
                    "drafts": len(store.list_drafts()),
                    "pendingSchedules": len(store.list_schedules(status="pending")),
                    "recentPublishes": len(store.recent_publish_results(limit=20)),
                    "autoReplyEnabled": store.get_auto_reply_enabled(),
                    "pipelineMode": store.get_pipeline_mode(),
                    "pipelineRunning": current_run is not None,
                    "currentRun": current_run.model_dump() if current_run else None,
                }
                await websocket.send_json(payload)
                await asyncio.sleep(1)
        except WebSocketDisconnect:
            return
