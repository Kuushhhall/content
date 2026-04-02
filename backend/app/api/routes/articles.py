from fastapi import APIRouter, HTTPException, Query

from app.api.deps import SettingsDep, StoreDep
from app.api.schemas import ArticleOut, DraftOut
from app.llm.pipeline import generate_and_save_draft, rank_articles_by_title
from app.sources import tavily_client

router = APIRouter(prefix="/articles", tags=["articles"])

SEARCH_QUERIES = [
    "Supreme Court of India landmark judgment recent ruling",
    "India legal regulatory policy change enforcement action",
    "Indian corporate law business litigation legal tech AI",
]


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


@router.post("/run-cycle", response_model=dict)
async def run_content_cycle(store: StoreDep, settings: SettingsDep) -> dict:
    """Run full content cycle: 3 Tavily searches -> rank -> generate drafts."""
    import uuid
    from datetime import UTC, datetime

    cycle_id = str(uuid.uuid4())[:8]

    # Step 1: Run 3 Tavily searches
    all_articles = []
    for query in SEARCH_QUERIES:
        articles = tavily_client.search_tavily(settings, query, max_results=10)
        all_articles.extend(articles)

    # Deduplicate by URL
    seen_urls = set()
    unique_articles = []
    for a in all_articles:
        if a.url not in seen_urls:
            seen_urls.add(a.url)
            unique_articles.append(a)

    # Save all articles to store
    for a in unique_articles:
        store.upsert_article(a)

    if len(unique_articles) < 10:
        raise HTTPException(status_code=400, detail=f"Only found {len(unique_articles)} articles, need at least 10")

    # Step 2: LLM ranks top 10
    top_10_ids = rank_articles_by_title(unique_articles, settings)
    top_10 = [a for a in unique_articles if a.id in top_10_ids]

    # Step 3: Generate drafts for top 10
    drafts_created = []

    # 2 LinkedIn posts from top 2 articles
    for i, article in enumerate(top_10[:2]):
        draft = await generate_and_save_draft(store, settings, article, "linkedin")
        drafts_created.append(DraftOut.model_validate(draft.model_dump()))

    # 10 Framer posts
    for article in top_10:
        draft = await generate_and_save_draft(store, settings, article, "framer")
        drafts_created.append(DraftOut.model_validate(draft.model_dump()))

    # 10 X threads
    for article in top_10:
        draft = await generate_and_save_draft(store, settings, article, "x")
        drafts_created.append(DraftOut.model_validate(draft.model_dump()))

    return {
        "cycle_id": cycle_id,
        "total_articles": len(unique_articles),
        "top_10_ids": top_10_ids,
        "drafts_created": len(drafts_created),
        "drafts": drafts_created,
        "timestamp": datetime.now(UTC).isoformat(),
    }


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
