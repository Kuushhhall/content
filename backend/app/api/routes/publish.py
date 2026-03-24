from fastapi import APIRouter, HTTPException

from app.api.deps import SettingsDep, StoreDep
from app.api.schemas import PublishNowIn, PublishResultOut, ScheduleIn, ScheduleOut
from app.models.schedule import ScheduledPost
from app.state.store import StateStore
from app.workflows import publish as publish_workflow

router = APIRouter(tags=["publish"])


@router.post("/publish/now", response_model=PublishResultOut)
def publish_now(
    body: PublishNowIn,
    store: StoreDep,
    settings: SettingsDep,
) -> PublishResultOut:
    draft = store.get_draft(body.draft_id)
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")
    result = publish_workflow.publish_immediate(store, settings, body.draft_id)
    return PublishResultOut(
        platform=result.platform,
        success=result.success,
        external_id=result.external_id,
        message=result.message,
        at=result.at,
    )


@router.get("/publish/results", response_model=list[PublishResultOut])
def list_results(store: StoreDep, limit: int = 50) -> list[PublishResultOut]:
    rows = store.recent_publish_results(limit=limit)
    return [
        PublishResultOut(
            platform=r.platform,
            success=r.success,
            external_id=r.external_id,
            message=r.message,
            at=r.at,
        )
        for r in rows
    ]


@router.post("/schedule", response_model=ScheduleOut)
def create_schedule(body: ScheduleIn, store: StoreDep) -> ScheduleOut:
    if not store.get_draft(body.draft_id):
        raise HTTPException(status_code=404, detail="Draft not found")
    sid = StateStore.new_id("sch_")
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


@router.get("/schedule", response_model=list[ScheduleOut])
def list_schedule(store: StoreDep, status: str | None = None) -> list[ScheduleOut]:
    return [
        ScheduleOut(
            id=s.id,
            draft_id=s.draft_id,
            platform=s.platform,
            run_at=s.run_at,
            status=s.status,
            error=s.error,
        )
        for s in store.list_schedules(status=status)
    ]


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
