import asyncio
import logging
from datetime import datetime
from typing import List, Union

from app.core.config import Settings
from app.sources import tavily_client
from app.state.store import StateStore
from app.utils.content_fetcher import fetch_full_article_content

log = logging.getLogger(__name__)


async def run_ingestion(
    session_or_store: Union[object, StateStore],
    settings: Settings,
    query: str = "Supreme Court India judgment",
    days_back: int = 1,
    max_results: int = 15,
    sources: list[str] | None = None,
    include_images: bool = True,
) -> int:
    """Ingest legal news via Tavily and auto-fetch full content.

    Returns count of new/updated articles upserted.
    """
    store = session_or_store

    # 1. Search Tavily
    articles = tavily_client.search_legal_news(
        settings,
        query=query,
        days_back=days_back,
        max_results=max_results,
        include_images=include_images,
        include_domains=sources,
    )

    if not articles:
        log.info("Tavily returned no articles")
        return 0

    # 2. Deduplicate
    articles = deduplicate_articles(articles)

    # 3. Score virality
    articles = score_articles_for_virality(articles)

    # 4. Fetch full content for each article concurrently
    async def _fetch_content(article):
        # Skip if Tavily already provided full content
        if article.full_content_fetched and article.full_content and len(article.full_content) > 200:
            return article
        # Fallback: use BeautifulSoup to scrape the article page
        content = await fetch_full_article_content(
            article.url,
            fallback=article.raw_excerpt or article.summary_hint or "",
        )
        if content:
            article.full_content = content
            article.full_content_fetched = True
        return article

    articles = await asyncio.gather(*[_fetch_content(a) for a in articles])

    # 5. Upsert to store
    count = 0
    for article in articles:
        existing = store.get_article(article.id)
        should_upsert = (
            existing is None
            or existing.title != article.title
            or existing.full_content != article.full_content
        )
        if should_upsert:
            store.upsert_article(article)
            count += 1

    log.info("Ingestion upserted %d articles (days_back=%d)", count, days_back)
    return count


def deduplicate_articles(articles: List) -> List:
    """Remove duplicate articles based on title+url fingerprint."""
    if not articles:
        return []
    articles.sort(key=lambda x: x.published_at or datetime.min, reverse=True)
    unique = []
    seen = set()
    for article in articles:
        fp = hash((article.title.lower(), article.url.lower()))
        if fp not in seen:
            seen.add(fp)
            unique.append(article)
    return unique


def score_articles_for_virality(articles: List) -> List:
    """Score articles 0.0–1.0 based on keywords, recency, source credibility."""
    virality_keywords = [
        'supreme court', 'high court', 'judgment', 'ruling', 'landmark', 'historic',
        'controversial', 'breaking', 'constitution', 'article 21', 'fundamental right',
        'government', 'policy', 'regulation', 'law', 'act', 'bill', 'amendment',
        'fraud', 'corruption', 'arrest', 'bail', 'acquittal', 'conviction',
    ]
    high_cred_sources = {'LiveLaw', 'Bar and Bench', 'SCC Online', 'Supreme Court', 'Indian Kanoon'}

    for article in articles:
        score = 0.0
        content_lower = (article.title + ' ' + (article.summary_hint or '')).lower()

        # Source credibility
        if article.source in high_cred_sources:
            score += 0.3

        # Keyword match
        for kw in virality_keywords:
            if kw in content_lower:
                score += 0.05

        # Title length optimum (40–70 chars)
        if 40 <= len(article.title) <= 70:
            score += 0.1

        # Recency bonus
        if article.published_at:
            try:
                from datetime import UTC
                now = datetime.now(UTC)
                pa = article.published_at
                if pa.tzinfo is None:
                    pa = pa.replace(tzinfo=UTC)
                hours_old = (now - pa).total_seconds() / 3600
                if hours_old < 6:
                    score += 0.3
                elif hours_old < 24:
                    score += 0.2
                elif hours_old < 72:
                    score += 0.1
            except Exception:
                pass

        article.content_intelligence.virality_score = min(max(score, 0.0), 1.0)

    return articles
