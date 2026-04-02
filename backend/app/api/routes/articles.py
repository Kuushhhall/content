from fastapi import APIRouter, HTTPException, Query

from app.api.deps import SettingsDep, StoreDep
from app.api.schemas import ArticleOut, DraftOut
from app.llm.pipeline import run_full_cycle

router = APIRouter(prefix="/articles", tags=["articles"])


@router.get("", response_model=dict)
async def list_articles(
    store: StoreDep,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
) -> dict:
    articles = store.list_articles(limit=200)
    total = len(articles)
    start = (page - 1) * page_size
    paginated = articles[start:start + page_size]
    return {
        "items": [ArticleOut.model_validate(a.model_dump()) for a in paginated],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/cycle-progress", response_model=dict)
async def get_cycle_progress(store: StoreDep) -> dict:
    """Get the current cycle progress state (persistent across page navigations)."""
    progress = store.get_cycle_progress()
    return progress.to_dict()


@router.post("/run-cycle", response_model=dict)
async def run_content_cycle(store: StoreDep, settings: SettingsDep) -> dict:
    """Run full content cycle: 3 Tavily searches -> rank -> generate drafts."""
    # Check if a cycle is already running
    current = store.get_cycle_progress()
    if current.status == "running":
        raise HTTPException(status_code=409, detail=f"Cycle {current.cycle_id} is already running")

    # Reset progress before starting
    store.reset_cycle_progress()

    try:
        result = await run_full_cycle(store, settings)
        return result
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cycle failed: {str(e)}")


@router.post("/reset-cycle", response_model=dict)
async def reset_cycle(store: StoreDep) -> dict:
    """Reset the cycle progress so the button becomes clickable again."""
    store.reset_cycle_progress()
    return {"status": "reset"}


@router.get("/{article_id}", response_model=ArticleOut)
async def get_article(article_id: str, store: StoreDep) -> ArticleOut:
    a = store.get_article(article_id)
    if not a:
        raise HTTPException(status_code=404, detail="Article not found")
    return ArticleOut.model_validate(a.model_dump())


@router.delete("/{article_id}", response_model=dict)
async def delete_article(article_id: str, store: StoreDep) -> dict:
    if store.delete_article(article_id):
        return {"success": True, "deleted_id": article_id}
    raise HTTPException(status_code=404, detail="Article not found")
