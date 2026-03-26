from fastapi import APIRouter, HTTPException, Query

from app.api.deps import SettingsDep, StoreDep, DBSessionDep
from app.api.schemas import DraftGenerateIn, DraftOut, DraftUpdateIn
from app.llm.pipeline import generate_draft
from app.repositories.drafts import DraftRepository

router = APIRouter(prefix="/drafts", tags=["drafts"])


@router.get("", response_model=dict)
async def list_drafts(
    store: StoreDep,
    db: DBSessionDep,
    article_id: str | None = Query(None, description="Filter by article ID"),
    platform: str | None = Query(None, description="Filter by platform"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
) -> dict:
    """List drafts with pagination and filtering. O(log n) via database indexes."""
    if db:
        repo = DraftRepository(db)
        offset = (page - 1) * page_size
        drafts, total = await repo.list_drafts(
            article_id=article_id,
            platform=platform,
            limit=page_size,
            offset=offset,
        )
        return {
            "items": [DraftOut.model_validate(d.__dict__) for d in drafts],
            "total": total,
            "page": page,
            "page_size": page_size,
            "pages": (total + page_size - 1) // page_size,
        }
    else:
        # Fallback to in-memory store
        drafts = store.list_drafts(article_id=article_id)
        return {
            "items": [DraftOut.model_validate(d.model_dump()) for d in drafts],
            "total": len(drafts),
            "page": 1,
            "page_size": len(drafts),
            "pages": 1,
        }


@router.post("/generate", response_model=DraftOut)
def generate(body: DraftGenerateIn, store: StoreDep, settings: SettingsDep) -> DraftOut:
    article = store.get_article(body.article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    draft = generate_draft(
        store,
        settings,
        article,
        body.platform,
        draft_id=body.draft_id,
    )
    return DraftOut.model_validate(draft.model_dump())


@router.get("/{draft_id}", response_model=DraftOut)
def get_draft(draft_id: str, store: StoreDep) -> DraftOut:
    d = store.get_draft(draft_id)
    if not d:
        raise HTTPException(status_code=404, detail="Draft not found")
    return DraftOut.model_validate(d.model_dump())


@router.patch("/{draft_id}", response_model=DraftOut)
def patch_draft(draft_id: str, body: DraftUpdateIn, store: StoreDep) -> DraftOut:
    from datetime import UTC, datetime

    d = store.get_draft(draft_id)
    if not d:
        raise HTTPException(status_code=404, detail="Draft not found")
    if body.body is not None:
        d.body = body.body
        d.updated_at = datetime.now(UTC)
    store.upsert_draft(d)
    return DraftOut.model_validate(d.model_dump())
