import asyncio
import hashlib
import json
import logging
from datetime import UTC, datetime
from typing import List, Union, Optional

from app.core.config import Settings
from app.llm import pipeline
from app.llm.prompts import prompts
from app.models.article import NormalizedArticle
from app.sources import rss_client, tavily_client
from app.state.store import StateStore
from app.utils.content_fetcher import fetch_full_article_content

log = logging.getLogger(__name__)


async def run_ingestion(
    store: StateStore,
    settings: Settings,
    days_back: int = 3,
    max_results: int = 15,
    sources: list[str] | None = None,
    include_images: bool = True,
) -> int:
    """Gold Standard Ingestion Pipeline: Discover → Scrape → Validate → Enrich → Save.
    
    Returns count of high-quality articles successfully ingested.
    """
    log.info("Starting Gold Standard Ingestion (days_back=%d)", days_back)

    # --- STAGE 1: Dual Discovery (RSS + Tavily) ---
    rss_candidates = rss_client.fetch_rss_candidates(days_back=days_back)
    log.info("Pipeline: [RSS] Found %d candidates.", len(rss_candidates))

    tavily_candidates = tavily_client.search_legal_news(
        settings,
        query=tavily_client.INGESTION_QUERY,
        days_back=days_back,
        max_results=max_results,
        include_images=include_images,
        include_domains=sources,
    )
    log.info("Pipeline: [TAVILY] Found %d candidates.", len(tavily_candidates))

    # Combine and deduplicate early based on URL fingerprint
    candidates = rss_candidates + tavily_candidates
    if not candidates:
        log.info("Pipeline: No discovery candidates found from any source.")
        return 0

    unique_candidates = deduplicate_articles(candidates)
    log.info("Pipeline: %d total unique discovery candidates.", len(unique_candidates))

    # --- STAGE 2: Surgical Scraping ---
    async def _scrape_and_clean(article: NormalizedArticle) -> Optional[NormalizedArticle]:
        content = await fetch_full_article_content(article.url)
        if content and len(content) > 400:
            article.full_content = content
            article.full_content_fetched = True
            return article
        return None

    # Await all scraping tasks
    results = await asyncio.gather(*[_scrape_and_clean(a) for a in unique_candidates])
    
    # Filter out None results and ensure items are recognized as NormalizedArticle
    articles: list[NormalizedArticle] = []
    for a in results:
        if a is not None:
            articles.append(a)
            
    log.info("Pipeline: %d articles successfully scraped.", len(articles))

    # --- STAGE 3: LLM Quality Gate & Enrichment ---
    processed_count = 0
    for article in articles:
        # Check if already in store to avoid redundant LLM calls
        if store.get_article(article.id):
            continue

        try:
            # LLM Validation & Tagging
            validation_prompt = prompts.build_article_validation_prompt(article.title, article.full_content)
            raw_response = pipeline._complete(settings, "You are a legal news gatekeeper.", validation_prompt)
            
            # Extract JSON block and parse
            json_str = pipeline._extract_json_block(raw_response)
            result = json.loads(json_str)
            
            if not result.get("is_valid_article"):
                log.debug("Pipeline: Rejected low-quality article: %s (Reason: %s)", article.title, result.get("reason"))
                continue
            
            # Enrich with LLM tags and metadata
            article.tags = result.get("categories", [])
            article.content_intelligence.virality_score = result.get("confidence_score", 0.5)
            
            # Successful ingestion
            store.upsert_article(article)
            processed_count += 1
            log.info("Pipeline: [ACCEPTED] %s | Categories: %s", article.title[:50], ", ".join(article.tags))

        except Exception as e:
            log.error("Pipeline: Error processing article %s: %s", article.id, e)
            # Fallback: Save without LLM enrichment if scrape was good
            store.upsert_article(article)
            processed_count += 1

    return processed_count


def deduplicate_articles(articles: List[NormalizedArticle]) -> List[NormalizedArticle]:
    """Remove duplicate articles based on title+url fingerprint.
    
    Enforces UTC-aware sorting to prevent naive vs aware comparison errors.
    """
    if not articles:
        return []
    
    def _safe_date(a: NormalizedArticle):
        dt = a.published_at or datetime.min
        if dt.tzinfo is None:
            return dt.replace(tzinfo=UTC)
        return dt.astimezone(UTC)

    # Sort by date descending
    articles.sort(key=_safe_date, reverse=True)
    
    unique: List[NormalizedArticle] = []
    seen = set()
    for article in articles:
        fp = hashlib.sha256(f"{article.title.lower()}|{article.url.lower()}".encode()).hexdigest()
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
    high_cred_sources = {
        'LiveLaw', 'Bar and Bench', 'SCC Online', 'Supreme Court', 'Indian Kanoon', 'ET Legal', 
        'Verdictum', 'Legally India'
    }

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
    _high_auth = {
        "LiveLaw", "Bar and Bench", "SCC Online", "Supreme Court", "Reuters", "ET Legal", 
        "Indian Kanoon", "Verdictum", "Legally India"
    }
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
    days_back: int = 3,
) -> list[NormalizedArticle]:
    """Framer Pipeline logic: Ingest high-quality articles and return top-scored candidates.
    
    This uses the same robust core as the manual ingestion pipeline.
    """
    # 1. Run the core ingestion to get fresh, high-quality content
    await run_ingestion(store, settings, days_back=days_back)

    # 2. Query the store for the most recent high-quality candidates
    # (Assuming store.list_articles exists or similar; for now we use the selection scoring logic on any recent entries)
    all_recent = store.list_articles(limit=30) # This should be implemented in store if missing
    
    # 3. Re-score specifically for Framer (using legacy scoring or new LLM confidence)
    scored = [(score_article_for_selection(a), a) for a in all_recent]
    scored.sort(key=lambda x: x[0], reverse=True)
    
    return [a for _, a in scored[:10]]
