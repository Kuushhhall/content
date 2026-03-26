from fastapi import APIRouter, HTTPException, Query

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


@router.get("/publish/results", response_model=dict)
def list_results(
    store: StoreDep,
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
) -> dict:
    """List publish results with pagination."""
    all_results = store.recent_publish_results(limit=1000)  # Get all for pagination
    total = len(all_results)
    
    # Apply pagination
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    paginated_results = all_results[start_idx:end_idx]
    
    return {
        "items": [
            PublishResultOut(
                platform=r.platform,
                success=r.success,
                external_id=r.external_id,
                message=r.message,
                at=r.at,
            )
            for r in paginated_results
        ],
        "total": total,
        "page": page,
        "page_size": limit,
        "pages": (total + limit - 1) // limit if total > 0 else 1,
    }


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


@router.get("/schedule", response_model=dict)
def list_schedule(
    store: StoreDep,
    status: str | None = None,
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
) -> dict:
    """List schedules with pagination."""
    all_schedules = store.list_schedules(status=status)
    total = len(all_schedules)
    
    # Apply pagination
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    paginated_schedules = all_schedules[start_idx:end_idx]
    
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
            for s in paginated_schedules
        ],
        "total": total,
        "page": page,
        "page_size": limit,
        "pages": (total + limit - 1) // limit if total > 0 else 1,
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
