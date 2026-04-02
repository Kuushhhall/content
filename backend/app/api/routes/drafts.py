from datetime import datetime
from fastapi import APIRouter, HTTPException, Query

from app.api.deps import StoreDep
from app.api.schemas import DraftOut, DraftUpdateIn

router = APIRouter(prefix="/drafts", tags=["drafts"])


@router.get("", response_model=dict)
async def list_drafts(
    store: StoreDep,
    platform: str | None = Query(None),
) -> dict:
    drafts = store.list_drafts()
    if platform:
        drafts = [d for d in drafts if d.platform == platform]
    return {
        "items": [DraftOut.model_validate(d.model_dump()) for d in drafts],
        "total": len(drafts),
    }


@router.get("/{draft_id}", response_model=DraftOut)
async def get_draft(draft_id: str, store: StoreDep) -> DraftOut:
    d = store.get_draft(draft_id)
    if not d:
        raise HTTPException(status_code=404, detail="Draft not found")
    return DraftOut.model_validate(d.model_dump())


@router.patch("/{draft_id}", response_model=DraftOut)
async def patch_draft(draft_id: str, body: DraftUpdateIn, store: StoreDep) -> DraftOut:
    from datetime import UTC

    d = store.get_draft(draft_id)
    if not d:
        raise HTTPException(status_code=404, detail="Draft not found")
    if body.body is not None:
        d.body = body.body
        d.updated_at = datetime.now(UTC)
    store.upsert_draft(d)
    return DraftOut.model_validate(d.model_dump())


@router.delete("/{draft_id}", response_model=dict)
async def delete_draft(draft_id: str, store: StoreDep) -> dict:
    if store.delete_draft(draft_id):
        return {"success": True, "deleted_id": draft_id}
    raise HTTPException(status_code=404, detail="Draft not found")
