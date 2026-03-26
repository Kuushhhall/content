from fastapi import APIRouter, HTTPException, Query

from app.api.deps import SettingsDep, StoreDep, DBSessionDep
from app.api.schemas import ArticleOut
from app.repositories.articles import ArticleRepository
from app.workflows import ingest as ingest_workflow

router = APIRouter(prefix="/articles", tags=["articles"])


@router.get("", response_model=dict)
async def list_articles(
    store: StoreDep,
    db: DBSessionDep,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    source: str | None = Query(None, description="Filter by source"),
    kind: str | None = Query(None, description="Filter by kind"),
    sort_by: str = Query("published_at", description="Sort field"),
    order: str = Query("desc", description="Sort order (asc/desc)"),
) -> dict:
    """List articles with pagination and filtering. O(log n) via database indexes."""
    if db:
        # Use database with pagination
        repo = ArticleRepository(db)
        offset = (page - 1) * page_size
        articles, total = await repo.list_articles(
            source=source,
            kind=kind,
            sort_by=sort_by,
            order=order,
            limit=page_size,
            offset=offset,
        )
        return {
            "items": [ArticleOut.model_validate(a.__dict__) for a in articles],
            "total": total,
            "page": page,
            "page_size": page_size,
            "pages": (total + page_size - 1) // page_size,
        }
    else:
        # Fallback to in-memory store (no pagination)
        articles = store.list_articles()
        return {
            "items": [ArticleOut.model_validate(a.model_dump()) for a in articles],
            "total": len(articles),
            "page": 1,
            "page_size": len(articles),
            "pages": 1,
        }


@router.get("/{article_id}", response_model=ArticleOut)
def get_article(article_id: str, store: StoreDep) -> ArticleOut:
    a = store.get_article(article_id)
    if not a:
        raise HTTPException(status_code=404, detail="Article not found")
    return ArticleOut.model_validate(a.model_dump())


@router.post("/ingest", response_model=dict)
async def trigger_ingest(store: StoreDep, settings: SettingsDep) -> dict:
    n = await ingest_workflow.run_ingestion(store, settings)
    return {"upserted": n}
