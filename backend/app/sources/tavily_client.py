import hashlib
import logging
import re
from datetime import UTC, datetime, timedelta

import httpx

from app.core.config import Settings
from app.models.article import NormalizedArticle

log = logging.getLogger(__name__)

TAVILY_SEARCH_URL = "https://api.tavily.com/search"

# Verified Indian legal news sources
LEGAL_SOURCES = [
    "livelaw.in",
    "barandbench.com",
    "economictimes.indiatimes.com",
    "indialegallive.com"
]


# High-impact query used for discovery phase
INGESTION_QUERY = (
    "Indian legal news LiveLaw, Bar and Bench, ET Legal, IndiaLegalLive: "
    "breaking court rulings, regulatory news, major corporate litigation. "
    "-inurl:category -inurl:tag -inurl:archive -inurl:author"
)

# URL patterns to exclude (avoid landing pages/archives)
EXCLUDE_URL_PATTERNS = [
    "/category/", "/archive/", "/author/", "/tag/", "/search/", 
    "/topics/", "/taxonomy/", "/page/", "/about-us/", "/contact-us/"
]


def _extract_date_from_content(content: str, title: str) -> datetime | None:
    """Extract publication date from content or title."""
    date_patterns = [
        r'(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})',
        r'(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})',
        r'(\d{1,2})/(\d{1,2})/(\d{4})',
        r'(\d{4})-(\d{1,2})-(\d{1,2})',
        r'(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})',
    ]

    month_map = {
        'january': 1, 'february': 2, 'march': 3, 'april': 4, 'may': 5, 'june': 6,
        'july': 7, 'august': 8, 'september': 9, 'october': 10, 'november': 11, 'december': 12,
        'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'jun': 6, 'jul': 7, 'aug': 8,
        'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12,
    }

    text_to_search = f"{title} {content}"

    for pattern in date_patterns:
        match = re.search(pattern, text_to_search, re.IGNORECASE)
        if match:
            try:
                # If extracted content is too short, use fallback
                if len(content) < 400:  # Increased threshold for proper articles
                    pass
                groups = match.groups()
                if len(groups) == 3:
                    if groups[1].lower() in month_map:
                        if groups[0].isdigit():
                            day, month_str, year = groups
                        else:
                            month_str, day, year = groups
                        month = month_map[month_str.lower()]
                        return datetime(int(year), month, int(day), tzinfo=UTC)
                    else:
                        if '/' in pattern:
                            day, month, year = groups
                        else:
                            year, month, day = groups
                        return datetime(int(year), int(month), int(day), tzinfo=UTC)
            except (ValueError, KeyError):
                continue

    return None


def search_legal_news(
    settings: Settings,
    query = INGESTION_QUERY,
    search_depth: str = "advanced",
    max_results: int = 10,
    include_images: bool = True,
    include_domains: list[str] | None = None,
    days_back: int = 3,
) -> list[NormalizedArticle]:
    """Search for Indian legal news via Tavily.

    Args:
        settings: App settings (needs TAVILY_API_KEY)
        query: Search query string
        search_depth: "basic" or "advanced"
        max_results: Maximum number of results
        include_images: Whether to include images from results
        include_domains: Override domain list (defaults to LEGAL_SOURCES)
        days_back: How many days back to search (1=last 24h, 2=last 2 days, etc.)
    """
    if not settings.tavily_api_key:
        log.error("Tavily API key not configured")
        raise ValueError("Tavily API key not configured. Please set TAVILY_API_KEY in your .env file")

    # Compute date range
    now = datetime.now(UTC)
    start_date = now - timedelta(days=days_back)

    domains = include_domains if include_domains is not None else LEGAL_SOURCES

    payload = {
        "api_key": settings.tavily_api_key,
        "query": query[:395],  # Tavily limit is 400 chars; safe truncation
        "search_depth": search_depth,
        "topic": "general",
        "include_answer": True,
        "max_results": max_results,
        "include_images": include_images,
        "include_raw_content": True,
        "include_domains": domains,
        
    }

    out: list[NormalizedArticle] = []
    try:
        with httpx.Client(timeout=30.0) as client:
            r = client.post(TAVILY_SEARCH_URL, json=payload)
            r.raise_for_status()
            data = r.json()
            raw_results = data.get("results") or []
            log.info("Tavily API returned %d raw results for query: %r", len(raw_results), query[:50])
            if not raw_results:
                log.debug("Full Tavily Response: %r", data)
    except Exception:
        log.exception("Tavily search failed")
        return []

    # Collect images returned at top level
    raw_images = data.get("images") or []
    top_images: list[str] = [
        img if isinstance(img, str) else img.get("url", "")
        for img in raw_images
        if (img if isinstance(img, str) else img.get("url", ""))
    ]

    for idx, item in enumerate(raw_results):
        url = (item.get("url") or "").strip()
        title = (item.get("title") or "").strip()
        content = item.get("content") or ""
        
        if not url or not title:
            continue

        # Pattern-based filtering (Phase 1 reinforcement)
        if any(p in url.lower() for p in EXCLUDE_URL_PATTERNS):
            continue

        aid = hashlib.sha256(f"discovery|{url}".encode("utf-8")).hexdigest()[:32]

        # Basic metadata extraction
        image_url = item.get("image") or (top_images[idx] if idx < len(top_images) else None)
        source = _domain_to_source(url)

        out.append(
            NormalizedArticle(
                id=aid,
                source=source,
                title=title or url,
                url=url,
                summary_hint=str(content)[:600],
                fetched_at=now,
                full_content_fetched=False, # We let the surgical scraper handle this
                kind="discovery",
                image_url=image_url,
            )
        )

    log.info("Discovery: Tavily found %d candidates for query: %r", len(out), query[:30])
    return out


def _domain_to_source(url: str) -> str:
    """Map URL domain to a human-readable source name."""
    domain_map = {
        "livelaw.in": "LiveLaw",
        "barandbench.com": "Bar and Bench",
        "economictimes.indiatimes.com": "ET Legal",
        "indiankanoon.org": "Indian Kanoon",
        "indialegallive.com": "IndiaLegalLive",
    }
    for domain, name in domain_map.items():
        if domain in url:
            return name
    return "Tavily"


def search_legal_news_multi(
    settings: Settings,
    queries: list[str] | None = None,
    days_back: int = 3,
) -> list[NormalizedArticle]:
    """Single broad Tavily query for the Framer auto pipeline.

    Uses one comprehensive query with more results instead of multiple narrow queries.
    LLM will select the best article from the candidates (title-only selection to save tokens).
    """
    if not settings.tavily_api_key:
        raise ValueError("Tavily API key not configured. Please set TAVILY_API_KEY in your .env file")

    query = queries[0] if queries else INGESTION_QUERY
    results = search_legal_news(
        settings,
        query=query,
        search_depth="advanced",
        max_results=10,
        include_images=True,
        days_back=days_back,
    )
    log.info(
        "Ingestion: query len=%d chars → %d articles (days_back=%d)",
        len(query), len(results), days_back,
    )
    return results

