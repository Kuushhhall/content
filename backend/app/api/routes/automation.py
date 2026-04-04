"""
API routes for social media automation.
"""

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from automation import automation_runner

log = logging.getLogger(__name__)

router = APIRouter(prefix="/automation", tags=["automation"])


class StartCycleRequest(BaseModel):
    pass


class ExecuteActionRequest(BaseModel):
    time: str
    platform: str
    action: str


class RetryRequest(BaseModel):
    draft_id: Optional[str] = None


@router.get("/status")
async def get_automation_status():
    """Get current automation status - cycle, queue, posted, failed."""
    status = automation_runner.get_status()
    return status


@router.post("/start-cycle")
async def start_cycle():
    """Start a new automation cycle manually."""
    result = automation_runner.start_new_cycle()
    if result.get("success"):
        return result
    else:
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to start cycle"))


@router.post("/start-cycle-with-catchup")
async def start_cycle_with_catchup():
    """Start cycle with catch-up for missed schedules if past 10 AM."""
    from automation import scheduler as scheduler_module
    
    result = scheduler_module.manual_start_with_catchup()
    if result.get("success"):
        return result
    else:
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to start cycle"))


@router.post("/catch-up")
async def catch_up():
    """Manually trigger catch-up for missed schedules."""
    from automation import scheduler as scheduler_module
    
    try:
        await scheduler_module.catch_up_missed()
        return {"success": True, "message": "Catch-up completed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/full-reset")
async def full_reset():
    """Complete reset of all automation state."""
    result = automation_runner.full_reset()
    return result


@router.post("/fetch-and-start")
async def fetch_and_start():
    """Fetch news (run pipeline), then start cycle with catch-up."""
    try:
        result = await automation_runner.fetch_news_and_start()
        if result.get("success"):
            return result
        else:
            raise HTTPException(status_code=400, detail=result.get("error"))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/post-now")
async def post_now():
    """Override: run pipeline and post immediately to all available platforms."""
    try:
        result = await automation_runner.post_now_override()
        if result.get("success"):
            return result
        else:
            raise HTTPException(status_code=400, detail=result.get("error"))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/post-draft/{draft_id}")
async def post_specific_draft(draft_id: str):
    """Post a specific draft by ID."""
    try:
        result = await automation_runner.post_specific_draft(draft_id)
        if result.get("success"):
            return result
        else:
            raise HTTPException(status_code=400, detail=result.get("error"))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/pause")
async def pause_cycle():
    """Pause the running cycle."""
    result = automation_runner.pause_cycle()
    if result.get("success"):
        return result
    else:
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to pause"))


@router.post("/resume")
async def resume_cycle():
    """Resume a paused cycle."""
    result = automation_runner.resume_cycle()
    if result.get("success"):
        return result
    else:
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to resume"))


@router.post("/skip")
async def skip_post():
    """Skip the current scheduled post."""
    result = automation_runner.skip_current_post()
    if result.get("success"):
        return result
    else:
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to skip"))


@router.post("/retry")
async def retry_post(request: RetryRequest):
    """Retry a failed post."""
    result = automation_runner.retry_failed_post(request.draft_id)
    if result.get("success"):
        return result
    else:
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to retry"))


@router.get("/draft/{draft_id}")
async def get_draft(draft_id: str):
    """Get draft content for preview."""
    result = automation_runner.get_draft_content(draft_id)
    if result.get("success"):
        return result
    else:
        raise HTTPException(status_code=404, detail=result.get("error", "Draft not found"))


@router.post("/execute")
async def execute_action(request: ExecuteActionRequest):
    """Execute a scheduled action manually."""
    import asyncio
    result = await automation_runner.execute_scheduled_action(
        request.time,
        request.platform,
        request.action
    )
    return result


@router.get("/history")
async def get_cycle_history():
    """Get cycle history."""
    from pathlib import Path
    import json
    
    history_file = Path(__file__).parent.parent.parent / "data" / "cycle_history.json"
    if history_file.exists():
        with open(history_file, "r") as f:
            return json.load(f)
    return []


@router.post("/clear")
async def clear_cycle():
    """Clear state and prepare for new cycle."""
    automation_runner.clear_for_new_cycle()
    return {"success": True, "message": "Cycle cleared, ready for new cycle"}


@router.get("/queue")
async def get_queue():
    """Get current posting queue with titles."""
    status = automation_runner.get_status()
    return {
        "queue": status.get("queue", []),
        "posted": status.get("posted", []),
        "failed": status.get("failed", [])
    }
