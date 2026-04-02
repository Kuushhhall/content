from datetime import datetime
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.api.deps import SettingsDep, StoreDep
from app.api.schemas import ArticleOut, ArticleUpdateIn, IngestOptionsIn
from app.workflows import ingest as ingest_workflow
from app.sources import tavily_client


class SearchNewsIn(BaseModel):
    query: str
    max_results: int = 10
    search_depth: str = "advanced"
    sources: list[str] | None = None
    days_back: int = 1
    include_images: bool = True


class UpsertSelectedIn(BaseModel):
    articles: list[dict]


class SelectBatchIn(BaseModel):
    article_ids: list[str]


router = APIRouter(prefix="/articles", tags=["articles"])


@router.get("", response_model=dict)
async def list_articles(
    store: StoreDep,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    source: str | None = Query(None),
    kind: str | None = Query(None),
    sort_by: str = Query("published_at"),
    order: str = Query("desc"),
    selected_only: bool = Query(False),
) -> dict:
    articles = store.list_articles()

    if source:
        articles = [a for a in articles if a.source == source]
    if kind:
        articles = [a for a in articles if a.kind == kind]
    if selected_only:
        articles = [a for a in articles if a.selected]

    def _safe_date(a: NormalizedArticle):
        dt = a.published_at or datetime.min
        if dt.tzinfo is None:
            return dt.replace(tzinfo=UTC)
        return dt.astimezone(UTC)

    reverse = order.lower() == "desc"
    if sort_by == "published_at":
        articles.sort(key=_safe_date, reverse=reverse)
    elif sort_by == "title":
        articles.sort(key=lambda x: x.title.lower(), reverse=reverse)
    elif sort_by == "virality":
        articles.sort(key=lambda x: x.content_intelligence.virality_score, reverse=reverse)

    total = len(articles)
    start = (page - 1) * page_size
    paginated = articles[start:start + page_size]

    return {
        "items": [ArticleOut.model_validate(a.model_dump()) for a in paginated],
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": max(1, (total + page_size - 1) // page_size),
    }


# --- Static routes BEFORE /{article_id} ---

@router.post("/ingest", response_model=dict)
async def trigger_ingest(
    store: StoreDep,
    settings: SettingsDep,
    body: IngestOptionsIn = IngestOptionsIn(),
) -> dict:
    """Ingest latest legal news from Tavily with full content fetch.
    
    Always uses INGESTION_QUERY for consistent high-impact legal news discovery.
    """
    n = await ingest_workflow.run_ingestion(
        store,
        settings,
        days_back=body.days_back,
        max_results=body.max_results,
        sources=body.sources,
        include_images=body.include_images,
    )
    return {"upserted": n}


@router.post("/search", response_model=dict)
async def search_news(body: SearchNewsIn, store: StoreDep, settings: SettingsDep) -> dict:
    """Search for news via Tavily with filters. Results are NOT auto-saved."""
    try:
        articles = tavily_client.search_legal_news(
            settings,
            query=body.query,
            search_depth=body.search_depth,
            max_results=body.max_results,
            include_images=body.include_images,
            include_domains=body.sources,
            days_back=body.days_back,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {
        "items": [ArticleOut.model_validate(a.model_dump()) for a in articles],
        "total": len(articles),
    }


@router.post("/select-batch", response_model=dict)
async def select_batch_articles(body: SelectBatchIn, store: StoreDep) -> dict:
    selected_count = 0
    for article_id in body.article_ids:
        article = store.get_article(article_id)
        if article:
            article.selected = True
            store.upsert_article(article)
            selected_count += 1
    return {
        "selected_count": selected_count,
        "total_requested": len(body.article_ids),
        "message": f"Selected {selected_count} of {len(body.article_ids)} articles",
    }


@router.post("/upsert-selected", response_model=dict)
async def upsert_selected_articles(body: UpsertSelectedIn, store: StoreDep) -> dict:
    """Save selected search results into the store (adds to NewsFeed)."""
    from app.models.article import NormalizedArticle
    from app.models.article import ContentIntelligence

    upserted = 0
    for article_data in body.articles:
        ci_data = article_data.get("content_intelligence") or {}
        ci = ContentIntelligence(
            topic=ci_data.get("topic", ""),
            legal_area=ci_data.get("legal_area", ""),
            audience=ci_data.get("audience", []),
            angle=ci_data.get("angle", ""),
            complexity_level=ci_data.get("complexity_level", "intermediate"),
            virality_score=ci_data.get("virality_score", 0.0),
            relevance_score=ci_data.get("relevance_score", 0.0),
            key_insights=ci_data.get("key_insights", []),
            affected_parties=ci_data.get("affected_parties", []),
            legal_implications=ci_data.get("legal_implications", []),
            suggested_hashtags=ci_data.get("suggested_hashtags", []),
        )
        try:
            article = NormalizedArticle(
                id=article_data["id"],
                source=article_data.get("source", "Tavily"),
                title=article_data["title"],
                url=article_data["url"],
                summary_hint=article_data.get("summary_hint", ""),
                published_at=article_data.get("published_at"),
                raw_excerpt=article_data.get("raw_excerpt"),
                kind=article_data.get("kind", "tavily"),
                full_content=article_data.get("full_content", ""),
                image_url=article_data.get("image_url"),
                selected=True,
                content_intelligence=ci,
            )
        except Exception:
            continue

        existing = store.get_article(article.id)
        if existing is None:
            store.upsert_article(article)
            upserted += 1
        else:
            existing.selected = True
            store.upsert_article(existing)
            upserted += 1

    return {"upserted": upserted}


# --- Parameterized routes AFTER static routes ---

@router.get("/{article_id}", response_model=ArticleOut)
async def get_article(article_id: str, store: StoreDep) -> ArticleOut:
    a = store.get_article(article_id)
    if not a:
        raise HTTPException(status_code=404, detail="Article not found")
    return ArticleOut.model_validate(a.model_dump())


@router.delete("/{article_id}", response_model=dict)
async def delete_article(article_id: str, store: StoreDep) -> dict:
    """Delete an article and its drafts."""
    if store.delete_article(article_id):
        return {"success": True, "deleted_id": article_id}
    raise HTTPException(status_code=404, detail="Article not found")


@router.patch("/{article_id}", response_model=ArticleOut)
async def update_article(article_id: str, body: ArticleUpdateIn, store: StoreDep) -> ArticleOut:
    article = store.get_article(article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if hasattr(article, key):
            setattr(article, key, value)
    store.upsert_article(article)
    return ArticleOut.model_validate(article.model_dump())


@router.get("/{article_id}/full-content", response_model=dict)
async def get_full_content(article_id: str, store: StoreDep) -> dict:
    """Fetch (or re-fetch) full article content via BeautifulSoup."""
    article = store.get_article(article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    from app.utils.content_fetcher import fetch_full_article_content
    full_content = await fetch_full_article_content(
        article.url,
        fallback=article.raw_excerpt or article.summary_hint or "",
    )

    article.full_content = full_content
    article.full_content_fetched = True
    store.upsert_article(article)

    return {
        "article_id": article_id,
        "full_content": full_content,
        "content_length": len(full_content),
        "fetched_at": article.fetched_at.isoformat(),
    }


@router.patch("/{article_id}/select", response_model=ArticleOut)
async def select_article(article_id: str, store: StoreDep) -> ArticleOut:
    article = store.get_article(article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    article.selected = True
    store.upsert_article(article)
    return ArticleOut.model_validate(article.model_dump())
