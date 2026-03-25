from fastapi import APIRouter, HTTPException

from app.api.deps import SettingsDep, StoreDep
from app.api.schemas import ArticleOut
from app.workflows import ingest as ingest_workflow

router = APIRouter(prefix="/articles", tags=["articles"])


@router.get("", response_model=list[ArticleOut])
def list_articles(store: StoreDep) -> list[ArticleOut]:
    return [ArticleOut.model_validate(a.model_dump()) for a in store.list_articles()]


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
