from datetime import datetime
from fastapi import APIRouter, HTTPException, Query

from app.api.deps import SettingsDep, StoreDep
from app.api.schemas import PublishNowIn, PublishResultOut, ScheduleIn, ScheduleOut
from app.platforms import framer as framer_pub

router = APIRouter(tags=["publish"])


@router.post("/publish/now", response_model=PublishResultOut)
def publish_now(body: PublishNowIn, store: StoreDep, settings: SettingsDep) -> PublishResultOut:
    """Publish immediately. Only works for Framer drafts."""
    draft = store.get_draft(body.draft_id)
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")

    if draft.platform.lower() != "framer":
        raise HTTPException(status_code=400, detail="Only Framer drafts can be published directly. Use copy for LinkedIn/X.")

    result = framer_pub.publish(draft, settings, as_draft=False)
    store.append_publish_result(result)

    return PublishResultOut(
        platform=result.platform,
        success=result.success,
        external_id=result.external_id,
        message=result.message,
        at=result.at,
    )


@router.get("/publish/results", response_model=dict)
def list_results(store: StoreDep) -> dict:
    rows = store.recent_publish_results(limit=100)
    return {
        "items": [
            PublishResultOut(
                platform=r.platform,
                success=r.success,
                external_id=r.external_id,
                message=r.message,
                at=r.at,
            )
            for r in rows
        ],
        "total": len(rows),
    }


@router.post("/schedule", response_model=ScheduleOut)
def create_schedule(body: ScheduleIn, store: StoreDep) -> ScheduleOut:
    draft = store.get_draft(body.draft_id)
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")

    sid = store.new_id("sch_")
    from app.models.schedule import ScheduledPost
    sched = ScheduledPost(
        id=sid,
        draft_id=body.draft_id,
        platform=body.platform,
        run_at=body.run_at,
        status="pending",
    )
    store.upsert_schedule(sched)
    return ScheduleOut(
        id=sched.id,
        draft_id=sched.draft_id,
        platform=sched.platform,
        run_at=sched.run_at,
        status=sched.status,
        error=sched.error,
    )


@router.get("/schedule", response_model=dict)
def list_schedule(store: StoreDep) -> dict:
    schedules = store.list_schedules()
    return {
        "items": [
            ScheduleOut(
                id=s.id,
                draft_id=s.draft_id,
                platform=s.platform,
                run_at=s.run_at,
                status=s.status,
                error=s.error,
            )
            for s in schedules
        ],
        "total": len(schedules),
    }


@router.delete("/schedule/{schedule_id}", response_model=ScheduleOut)
def cancel_schedule(schedule_id: str, store: StoreDep) -> ScheduleOut:
    s = store.get_schedule(schedule_id)
    if not s:
        raise HTTPException(status_code=404, detail="Schedule not found")
    if s.status == "pending":
        s.status = "cancelled"
        store.upsert_schedule(s)
    return ScheduleOut(
        id=s.id,
        draft_id=s.draft_id,
        platform=s.platform,
        run_at=s.run_at,
        status=s.status,
        error=s.error,
    )
