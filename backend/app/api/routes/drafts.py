from datetime import datetime
from fastapi import APIRouter, HTTPException, Query

from app.api.deps import SettingsDep, StoreDep
from app.api.schemas import DraftGenerateIn, DraftOut, DraftUpdateIn
from app.llm.pipeline import generate_draft

router = APIRouter(prefix="/drafts", tags=["drafts"])


@router.get("", response_model=dict)
async def list_drafts(
    store: StoreDep,
    article_id: str | None = Query(None, description="Filter by article ID"),
    platform: str | None = Query(None, description="Filter by platform"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
) -> dict:
    """List drafts from in-memory store."""
    drafts = store.list_drafts()

    # Apply filters
    if article_id:
        drafts = [d for d in drafts if d.article_id == article_id]
    if platform:
        drafts = [d for d in drafts if d.platform == platform]

    # Sort by created_at (newest first)
    drafts.sort(key=lambda x: x.created_at or datetime.min, reverse=True)

    # Simple pagination
    total = len(drafts)
    start = (page - 1) * page_size
    end = start + page_size
    paginated_drafts = drafts[start:end]

    return {
        "items": [DraftOut.model_validate(d.model_dump()) for d in paginated_drafts],
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": (total + page_size - 1) // page_size,
    }


@router.post("/generate", response_model=DraftOut)
async def generate(body: DraftGenerateIn, store: StoreDep, settings: SettingsDep) -> DraftOut:
    article = store.get_article(body.article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    # Pass StateStore to generate_draft
    try:
        draft = await generate_draft(
            store,
            settings,
            article,
            body.platform,
            draft_id=body.draft_id,
            linkedin_target=body.linkedin_target or "profile",
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return DraftOut.model_validate(draft.model_dump())


@router.get("/{draft_id}", response_model=DraftOut)
async def get_draft(draft_id: str, store: StoreDep) -> DraftOut:
    d = store.get_draft(draft_id)
    if not d:
        raise HTTPException(status_code=404, detail="Draft not found")
    return DraftOut.model_validate(d.model_dump())


@router.patch("/{draft_id}", response_model=DraftOut)
async def patch_draft(draft_id: str, body: DraftUpdateIn, store: StoreDep) -> DraftOut:
    from datetime import UTC, datetime

    d = store.get_draft(draft_id)
    if not d:
        raise HTTPException(status_code=404, detail="Draft not found")
    if body.body is not None:
        d.body = body.body
        d.updated_at = datetime.now(UTC)
    store.upsert_draft(d)
    return DraftOut.model_validate(d.model_dump())


@router.post("/{draft_id}/regenerate", response_model=DraftOut)
async def regenerate_draft(
    draft_id: str,
    store: StoreDep,
    settings: SettingsDep,
) -> DraftOut:
    """Regenerate a draft with a fresh LLM call using single-call optimization."""
    from app.llm.pipeline import generate_draft_single_call

    # Get existing draft
    existing_draft = store.get_draft(draft_id)
    if not existing_draft:
        raise HTTPException(status_code=404, detail="Draft not found")

    # Get original article
    article = store.get_article(existing_draft.article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    # Regenerate with single LLM call
    new_draft = await generate_draft_single_call(
        store,
        settings,
        article,
        existing_draft.platform,
        draft_id=draft_id,  # Keep same ID to overwrite
    )

    return DraftOut.model_validate(new_draft.model_dump())
