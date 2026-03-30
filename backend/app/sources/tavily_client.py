import hashlib
import logging
import re
from datetime import UTC, datetime, timedelta

import httpx

from app.core.config import Settings
from app.models.article import NormalizedArticle

log = logging.getLogger(__name__)

TAVILY_SEARCH_URL = "https://api.tavily.com/search"

# Top verified Indian legal news sources
LEGAL_SOURCES = [
    "livelaw.in",
    "barandbench.com",
    "scconline.com",
    "indiankanoon.org",
    "supremecourtofindia.nic.in",
    "lawstreet.in",
    "verdictum.in",
    "latestlaws.com",
    "legalserviceindia.com",
    "thehindu.com",
    "ndtv.com",
    "hindustantimes.com",
    "theprint.in",
    "scroll.in",
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
    query: str = "Supreme Court India judgment",
    search_depth: str = "basic",
    max_results: int = 15,
    include_images: bool = True,
    include_domains: list[str] | None = None,
    days_back: int = 1,
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
        "query": query,
        "search_depth": search_depth,
        "include_answer": False,
        "max_results": max_results,
        "include_images": include_images,
        "include_domains": domains,
    }

    out: list[NormalizedArticle] = []
    try:
        with httpx.Client(timeout=30.0) as client:
            r = client.post(TAVILY_SEARCH_URL, json=payload)
            r.raise_for_status()
            data = r.json()
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

    for idx, item in enumerate(data.get("results") or []):
        url = item.get("url") or ""
        title = item.get("title") or ""
        content = item.get("content") or ""
        if not url:
            continue

        aid = hashlib.sha256(f"tavily|{url}".encode("utf-8")).hexdigest()[:32]

        # Parse publication date
        published_str = item.get("published_date")
        published_at = None
        if published_str:
            try:
                published_at = datetime.fromisoformat(published_str.replace('Z', '+00:00'))
            except Exception:
                published_at = _extract_date_from_content(content, title)
        else:
            published_at = _extract_date_from_content(content, title)

        # Date filter: skip articles older than days_back
        if published_at:
            # Make naive datetimes UTC-aware for comparison
            pa = published_at if published_at.tzinfo else published_at.replace(tzinfo=UTC)
            if pa < start_date:
                continue

        # Image: prefer per-result image, fall back to top-level images list
        image_url: str | None = item.get("image") or (top_images[idx] if idx < len(top_images) else None)

        # Determine source from domain
        source = _domain_to_source(url)

        out.append(
            NormalizedArticle(
                id=aid,
                source=source,
                title=title.strip() or url,
                url=url.strip(),
                summary_hint=str(content)[:500],
                published_at=published_at,
                fetched_at=now,
                raw_excerpt=content[:2000] if content else None,
                kind="tavily",
                image_url=image_url,
            )
        )

    log.info("Tavily returned %d articles (days_back=%d, query=%r)", len(out), days_back, query)
    return out


def _domain_to_source(url: str) -> str:
    """Map URL domain to a human-readable source name."""
    domain_map = {
        "livelaw.in": "LiveLaw",
        "barandbench.com": "Bar and Bench",
        "scconline.com": "SCC Online",
        "indiankanoon.org": "Indian Kanoon",
        "supremecourtofindia.nic.in": "Supreme Court",
        "lawstreet.in": "Law Street",
        "verdictum.in": "Verdictum",
        "latestlaws.com": "Latest Laws",
        "legalserviceindia.com": "Legal Service India",
        "thehindu.com": "The Hindu",
        "ndtv.com": "NDTV",
        "hindustantimes.com": "Hindustan Times",
        "theprint.in": "The Print",
        "scroll.in": "Scroll",
    }
    for domain, name in domain_map.items():
        if domain in url:
            return name
    return "Tavily"


# Keep backward-compatible alias used in existing ingest workflow
def search_scc_legal_news(
    settings: Settings,
    query: str = "Supreme Court India judgment",
    search_depth: str = "basic",
    max_results: int = 15,
    include_images: bool = True,
    include_domains: list[str] | None = None,
    content_type: str = "text",
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    days_back: int = 1,
) -> list[NormalizedArticle]:
    return search_legal_news(
        settings=settings,
        query=query,
        search_depth=search_depth,
        max_results=max_results,
        include_images=include_images,
        include_domains=include_domains,
        days_back=days_back,
    )
