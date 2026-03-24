from fastapi import APIRouter, HTTPException

from app.api.deps import SettingsDep, StoreDep
from app.api.schemas import DraftGenerateIn, DraftOut, DraftUpdateIn
from app.llm.pipeline import generate_draft
router = APIRouter(prefix="/drafts", tags=["drafts"])


@router.get("", response_model=list[DraftOut])
def list_drafts(store: StoreDep, article_id: str | None = None) -> list[DraftOut]:
    drafts = store.list_drafts(article_id=article_id)
    return [DraftOut.model_validate(d.model_dump()) for d in drafts]


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
