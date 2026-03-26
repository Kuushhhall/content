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
async def generate(body: DraftGenerateIn, store: StoreDep, settings: SettingsDep, db: DBSessionDep) -> DraftOut:
    if db:
        from app.repositories.articles import ArticleRepository
        from app.models.article import NormalizedArticle
        repo = ArticleRepository(db)
        adb = await repo.get_by_id(body.article_id)
        if not adb:
            raise HTTPException(status_code=404, detail="Article not found")
        article = NormalizedArticle.model_validate(adb.__dict__)
        # Pass database session to generate_draft
        draft = await generate_draft(
            db,
            settings,
            article,
            body.platform,
            draft_id=body.draft_id,
        )
    else:
        article = store.get_article(body.article_id)
        if not article:
            raise HTTPException(status_code=404, detail="Article not found")
        # Pass StateStore to generate_draft
        draft = await generate_draft(
            store,
            settings,
            article,
            body.platform,
            draft_id=body.draft_id,
        )

    return DraftOut.model_validate(draft.model_dump())


@router.get("/{draft_id}", response_model=DraftOut)
async def get_draft(draft_id: str, store: StoreDep, db: DBSessionDep) -> DraftOut:
    if db:
        repo = DraftRepository(db)
        ddb = await repo.get_by_id(draft_id)
        if not ddb:
            raise HTTPException(status_code=404, detail="Draft not found")
        return DraftOut.model_validate(ddb.__dict__)
    else:
        d = store.get_draft(draft_id)
        if not d:
            raise HTTPException(status_code=404, detail="Draft not found")
        return DraftOut.model_validate(d.model_dump())


@router.patch("/{draft_id}", response_model=DraftOut)
async def patch_draft(draft_id: str, body: DraftUpdateIn, store: StoreDep, db: DBSessionDep) -> DraftOut:
    from datetime import UTC, datetime

    if db:
        repo = DraftRepository(db)
        ddb = await repo.get_by_id(draft_id)
        if not ddb:
            raise HTTPException(status_code=404, detail="Draft not found")
        if body.body is not None:
            ddb.body = body.body
            ddb.updated_at = datetime.now(UTC)
        await repo.upsert(ddb)
        await db.commit()
        return DraftOut.model_validate(ddb.__dict__)
    else:
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
    db: DBSessionDep,
) -> DraftOut:
    """Regenerate a draft with a fresh LLM call using single-call optimization."""
    from app.llm.pipeline import generate_draft_single_call
    from app.repositories.articles import ArticleRepository
    from app.models.article import NormalizedArticle
    
    # Get existing draft
    if db:
        draft_repo = DraftRepository(db)
        existing_draft = await draft_repo.get_by_id(draft_id)
        if not existing_draft:
            raise HTTPException(status_code=404, detail="Draft not found")
        
        # Get original article
        article_repo = ArticleRepository(db)
        article_db = await article_repo.get_by_id(existing_draft.article_id)
        if not article_db:
            raise HTTPException(status_code=404, detail="Article not found")
        article = NormalizedArticle.model_validate(article_db.__dict__)
    else:
        existing_draft = store.get_draft(draft_id)
        if not existing_draft:
            raise HTTPException(status_code=404, detail="Draft not found")
        
        article = store.get_article(existing_draft.article_id)
        if not article:
            raise HTTPException(status_code=404, detail="Article not found")
    
    # Regenerate with single LLM call
    new_draft = await generate_draft_single_call(
        db or store,
        settings,
        article,
        existing_draft.platform,
        draft_id=draft_id,  # Keep same ID to overwrite
    )
    
    return DraftOut.model_validate(new_draft.model_dump())
