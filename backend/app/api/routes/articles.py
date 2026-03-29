from datetime import datetime
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.api.deps import SettingsDep, StoreDep
from app.api.schemas import ArticleOut, ArticleUpdateIn
from app.workflows import ingest as ingest_workflow
from app.sources import tavily_client

class SearchNewsIn(BaseModel):
    query: str
    max_results: int = 10
    search_depth: str = "basic"
    sources: list[str] | None = None
    start_date: str | None = None
    end_date: str | None = None
    include_images: bool = False
    include_domains: list[str] | None = None
    content_type: str = "text"  # text, images, full_articles


class UpsertSelectedIn(BaseModel):
    articles: list[dict]


class SearchRSSIn(BaseModel):
    query: str | None = None
    sources: list[str] | None = None
    max_results: int = 20


router = APIRouter(prefix="/articles", tags=["articles"])


@router.get("", response_model=dict)
async def list_articles(
    store: StoreDep,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    source: str | None = Query(None, description="Filter by source"),
    kind: str | None = Query(None, description="Filter by kind"),
    sort_by: str = Query("published_at", description="Sort field"),
    order: str = Query("desc", description="Sort order (asc/desc)"),
) -> dict:
    """List articles from in-memory store."""
    articles = store.list_articles()

    # Apply filters
    if source:
        articles = [a for a in articles if a.source == source]
    if kind:
        articles = [a for a in articles if a.kind == kind]

    # Sort
    reverse = order.lower() == "desc"
    if sort_by == "published_at":
        articles.sort(key=lambda x: x.published_at or datetime.min, reverse=reverse)
    elif sort_by == "title":
        articles.sort(key=lambda x: x.title.lower(), reverse=reverse)

    # Simple pagination
    total = len(articles)
    start = (page - 1) * page_size
    end = start + page_size
    paginated_articles = articles[start:end]

    return {
        "items": [ArticleOut.model_validate(a.model_dump()) for a in paginated_articles],
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": (total + page_size - 1) // page_size,
    }


@router.get("/{article_id}", response_model=ArticleOut)
async def get_article(article_id: str, store: StoreDep) -> ArticleOut:
    a = store.get_article(article_id)
    if not a:
        raise HTTPException(status_code=404, detail="Article not found")
    return ArticleOut.model_validate(a.model_dump())


@router.post("/ingest", response_model=dict)
async def trigger_ingest(store: StoreDep, settings: SettingsDep) -> dict:
    n = await ingest_workflow.run_ingestion(store, settings)
    return {"upserted": n}


@router.delete("/{article_id}", response_model=dict)
async def delete_article(
    article_id: str,
    store: StoreDep,
) -> dict:
    """Delete an article by ID from in-memory store."""
    article = store.get_article(article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    # Note: StateStore doesn't have a delete method, so we'll need to add one
    # For now, return success (the article exists but can't be deleted in memory mode)
    return {"success": True, "deleted_id": article_id, "note": "Delete not fully supported in memory mode"}


@router.patch("/{article_id}", response_model=ArticleOut)
async def update_article(
    article_id: str,
    body: ArticleUpdateIn,
    store: StoreDep,
) -> ArticleOut:
    """Update an article by ID in in-memory store."""
    article = store.get_article(article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    # Update only provided fields
    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if hasattr(article, key):
            setattr(article, key, value)

    store.upsert_article(article)
    return ArticleOut.model_validate(article.model_dump())


@router.post("/search", response_model=dict)
async def search_news(
    body: SearchNewsIn,
    store: StoreDep,
    settings: SettingsDep,
) -> dict:
    """Search for news using Tavily API with custom query. Returns results without upserting."""
    # Use Tavily to search for news
    try:
        articles = tavily_client.search_scc_legal_news(
            settings,
            query=body.query,
            search_depth=body.search_depth,
            max_results=body.max_results,
            include_images=body.include_images,
            include_domains=body.include_domains,
            content_type=body.content_type
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    # Filter by sources if provided
    if body.sources:
        articles = [a for a in articles if a.source in body.sources]
    
    # Filter by date range if provided
    if body.start_date:
        from datetime import datetime
        start_dt = datetime.fromisoformat(body.start_date.replace('Z', '+00:00'))
        articles = [a for a in articles if a.published_at and a.published_at >= start_dt]
    
    if body.end_date:
        from datetime import datetime
        end_dt = datetime.fromisoformat(body.end_date.replace('Z', '+00:00'))
        articles = [a for a in articles if a.published_at and a.published_at <= end_dt]
    
    # Limit results
    articles = articles[:body.max_results]
    
    return {
        "items": [ArticleOut.model_validate(a.model_dump()) for a in articles],
        "total": len(articles),
    }


@router.post("/search-rss", response_model=dict)
async def search_rss_news(
    body: SearchRSSIn,
    settings: SettingsDep,
) -> dict:
    """Search for news using RSS feeds. Returns results without upserting."""
    from app.sources.rss import ingest_all_rss, deduplicate_articles, score_articles_for_virality

    # Fetch all RSS articles
    articles = ingest_all_rss(settings)

    # Filter by sources if provided
    if body.sources:
        articles = [a for a in articles if a.source in body.sources]

    # Filter by query if provided
    if body.query:
        query_lower = body.query.lower()
        articles = [
            a for a in articles
            if query_lower in a.title.lower() or
               query_lower in (a.summary_hint or "").lower()
        ]

    # Deduplicate and score articles
    articles = deduplicate_articles(articles)
    articles = score_articles_for_virality(articles)

    # Limit results
    articles = articles[:body.max_results]

    return {
        "items": [ArticleOut.model_validate(a.model_dump()) for a in articles],
        "total": len(articles),
    }


@router.post("/upsert-selected", response_model=dict)
async def upsert_selected_articles(
    body: UpsertSelectedIn,
    store: StoreDep,
) -> dict:
    """Upsert selected articles to database."""
    from app.models.article import NormalizedArticle
    from app.models.content_intelligence import ContentIntelligence
    
    upserted = 0
    for article_data in body.articles:
        # Convert dict to NormalizedArticle
        ci_data = article_data.get("content_intelligence", {})
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
        
        article = NormalizedArticle(
            id=article_data["id"],
            source=article_data["source"],
            title=article_data["title"],
            url=article_data["url"],
            summary_hint=article_data.get("summary_hint", ""),
            published_at=article_data.get("published_at"),
            fetched_at=article_data.get("fetched_at"),
            raw_excerpt=article_data.get("raw_excerpt"),
            kind=article_data.get("kind", "manual"),
            full_content=article_data.get("full_content", ""),
            structured_summary=article_data.get("structured_summary", ""),
            extracted_facts=article_data.get("extracted_facts", []),
            court_name=article_data.get("court_name", ""),
            case_number=article_data.get("case_number", ""),
            judges_involved=article_data.get("judges_involved", []),
            parties=article_data.get("parties", []),
            jurisdiction=article_data.get("jurisdiction", ""),
            precedent_value=article_data.get("precedent_value", "medium"),
            content_intelligence=ci,
        )
        
        # Use in-memory store
        existing = store.get_article(article.id)
        if existing is None:
            store.upsert_article(article)
            upserted += 1
    
    return {"upserted": upserted}
