import asyncio
import logging
from datetime import UTC, datetime
from typing import List, Union

from app.core.config import Settings
from app.models.article import NormalizedArticle
from app.sources import tavily_client
from app.state.store import StateStore
from app.utils.content_fetcher import fetch_full_article_content

log = logging.getLogger(__name__)


async def run_ingestion(
    session_or_store: Union[object, StateStore],
    settings: Settings,
    query: str | None = None,
    days_back: int = 1,
    max_results: int = 15,
    sources: list[str] | None = None,
    include_images: bool = True,
) -> int:
    """Ingest legal news via Tavily.

    Uses a single high-impact query across verified Indian legal sources.
    Returns count of new/updated articles upserted.
    """
    store = session_or_store

    # 1. Search Tavily with the high-impact query
    q = query or tavily_client.INGESTION_QUERY
    articles = tavily_client.search_legal_news(
        settings,
        query=q,
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
    """Score articles 0.0–1.0 and assign tags based on keywords, recency, source credibility."""
    landmark_keywords = ['landmark', 'historic', 'constitution', 'article 21', 'fundamental right', 'precedent', 'overruled']
    breaking_keywords = ['breaking', 'just in', 'urgent', 'exclusive', 'flash']
    hot_keywords = ['controversial', 'heated', 'debate', 'outrage', 'viral', 'trending', 'protest', 'backlash']
    legal_keywords = [
        'supreme court', 'high court', 'judgment', 'ruling', 'government', 'policy',
        'regulation', 'law', 'act', 'bill', 'amendment', 'fraud', 'corruption',
        'arrest', 'bail', 'acquittal', 'conviction', 'fir', 'petition', 'bench',
    ]
    high_cred_sources = {'LiveLaw', 'Bar and Bench', 'SCC Online', 'Supreme Court', 'Indian Kanoon', 'ET Legal'}

    for article in articles:
        score = 0.0
        tags: list[str] = []
        content_lower = (article.title + ' ' + (article.summary_hint or '')).lower()

        # Source credibility
        if article.source in high_cred_sources:
            score += 0.3

        # Legal keyword match
        for kw in legal_keywords:
            if kw in content_lower:
                score += 0.05

        # Tag: landmark
        if any(kw in content_lower for kw in landmark_keywords):
            tags.append('landmark')
            score += 0.15

        # Tag: breaking
        if any(kw in content_lower for kw in breaking_keywords):
            tags.append('breaking')
            score += 0.2

        # Tag: hot
        if any(kw in content_lower for kw in hot_keywords):
            tags.append('hot')
            score += 0.1

        # Title length optimum (40–70 chars)
        if 40 <= len(article.title) <= 70:
            score += 0.1

        # Recency bonus + tag
        if article.published_at:
            try:
                now = datetime.now(UTC)
                pa = article.published_at
                if pa.tzinfo is None:
                    pa = pa.replace(tzinfo=UTC)
                hours_old = (now - pa).total_seconds() / 3600
                if hours_old < 6:
                    score += 0.3
                    tags.append('recent')
                elif hours_old < 24:
                    score += 0.2
                    tags.append('recent')
                elif hours_old < 72:
                    score += 0.1
            except Exception:
                pass

        article.content_intelligence.virality_score = min(max(score, 0.0), 1.0)
        # Only assign tags if we found meaningful ones
        if tags:
            article.tags = list(dict.fromkeys(tags))  # deduplicate, preserve order

    return articles


# Max possible raw score: institution(3) + policy(3) + ai(2) + recency(4) + authority(2) + landmark(0.15) + breaking(0.2) + hot(0.1) ≈ 14
_MAX_SELECTION_SCORE = 14.0


def score_article_for_selection(article: NormalizedArticle) -> float:
    """Score a single article for Framer auto pipeline selection.

    Returns a raw float score (higher = more newsworthy/relevant).
    Weights are based on institution authority, policy impact, recency, and source credibility.
    """
    score = 0.0
    title = article.title or ""
    title_lower = title.lower()
    content_lower = (title + " " + (article.summary_hint or "")).lower()

    # Institution weight
    if "supreme court" in title_lower:
        score += 3
    elif "high court" in title_lower:
        score += 2
    elif any(w in title_lower for w in ["nclt", "tribunal", "nclat"]):
        score += 1

    # Policy / law change signals
    if any(w in title_lower for w in ["bill", "law", "regulation", "rule", "act", "amendment", "legislation"]):
        score += 3

    # Business / AI / tech relevance
    if any(w in title_lower for w in ["ai", "tech", "startup", "digital", "fintech", "data", "cyber"]):
        score += 2

    # Recency — most important for news
    if article.published_at:
        try:
            pa = article.published_at
            if pa.tzinfo is None:
                pa = pa.replace(tzinfo=UTC)
            hours_old = (datetime.now(UTC) - pa).total_seconds() / 3600
            if hours_old < 6:
                score += 4
            elif hours_old < 24:
                score += 2
            elif hours_old < 48:
                score += 1
        except Exception:
            pass

    # Source authority
    _high_auth = {"LiveLaw", "Bar and Bench", "SCC Online", "Supreme Court", "Reuters", "ET Legal", "Indian Kanoon"}
    if article.source in _high_auth:
        score += 2

    # Landmark / breaking signals (from existing keyword logic)
    landmark_kw = ["landmark", "historic", "constitution", "article 21", "fundamental right", "precedent", "overruled"]
    breaking_kw = ["breaking", "just in", "urgent", "exclusive", "flash"]
    if any(kw in content_lower for kw in landmark_kw):
        score += 1.5
    if any(kw in content_lower for kw in breaking_kw):
        score += 1.0

    # Prefer articles with richer content (better LLM input)
    if article.full_content_fetched and article.full_content and len(article.full_content) > 500:
        score += 0.5

    # Prefer articles with images (better Framer presentation)
    if article.image_url:
        score += 0.5

    return score


async def run_framer_ingestion(
    store: StateStore,
    settings: Settings,
    days_back: int = 2,
) -> list[NormalizedArticle]:
    """Single high-impact Tavily query → deduplicate → score → enrich top candidates.

    Returns candidates sorted by selection score descending.
    """
    # 1. Single Tavily search with the high-impact query
    raw_articles = tavily_client.search_legal_news_multi(settings, days_back=days_back)

    if not raw_articles:
        log.info("Framer ingestion: no articles returned from Tavily")
        return []

    # 2. Score all candidates for selection
    scored = [(score_article_for_selection(a), a) for a in raw_articles]
    scored.sort(key=lambda x: x[0], reverse=True)

    # 3. Fetch full content for top 15 only (saves API time)
    top_candidates = [a for _, a in scored[:15]]

    async def _fetch(article: NormalizedArticle) -> NormalizedArticle:
        if article.full_content_fetched and article.full_content and len(article.full_content) > 200:
            return article
        content = await fetch_full_article_content(
            article.url,
            fallback=article.raw_excerpt or article.summary_hint or "",
        )
        if content:
            article.full_content = content
            article.full_content_fetched = True
        return article

    top_candidates = list(await asyncio.gather(*[_fetch(a) for a in top_candidates]))

    # 4. Upsert all fetched candidates to store
    for article in top_candidates:
        existing = store.get_article(article.id)
        if existing is None or existing.full_content != article.full_content:
            store.upsert_article(article)

    # 5. Re-score after full content fetch (content length bonus may change)
    final_scored = [(score_article_for_selection(a), a) for a in top_candidates]
    final_scored.sort(key=lambda x: x[0], reverse=True)

    log.info(
        "Framer ingestion complete: %d candidates, top article: %r (score=%.1f)",
        len(final_scored),
        final_scored[0][1].title if final_scored else "none",
        final_scored[0][0] if final_scored else 0,
    )
    return [a for _, a in final_scored]
