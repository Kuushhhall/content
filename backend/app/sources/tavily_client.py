import hashlib
import logging
import re
from datetime import UTC, datetime

import httpx

from app.core.config import Settings
from app.models.article import NormalizedArticle

log = logging.getLogger(__name__)

TAVILY_SEARCH_URL = "https://api.tavily.com/search"


def _extract_date_from_content(content: str, title: str) -> datetime | None:
    """Extract publication date from content or title."""
    # Common date patterns in Indian legal news
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
        'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'jun': 6, 'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
    }
    
    text_to_search = f"{title} {content}"
    
    for pattern in date_patterns:
        match = re.search(pattern, text_to_search, re.IGNORECASE)
        if match:
            try:
                groups = match.groups()
                if len(groups) == 3:
                    if groups[1].lower() in month_map:
                        # Pattern: "12 March 2024" or "March 12, 2024"
                        if groups[0].isdigit():
                            day, month_str, year = groups
                        else:
                            month_str, day, year = groups
                        month = month_map[month_str.lower()]
                        return datetime(int(year), month, int(day))
                    else:
                        # Pattern: "12/03/2024" or "2024-03-12"
                        if '/' in pattern:
                            day, month, year = groups
                        else:
                            year, month, day = groups
                        return datetime(int(year), int(month), int(day))
            except (ValueError, KeyError):
                continue
    
    return None


def search_scc_legal_news(settings: Settings, query: str = "Supreme Court India judgment") -> list[NormalizedArticle]:
    if not settings.tavily_api_key:
        log.debug("Tavily API key not set — skipping SCC search")
        return []
    payload = {
        "api_key": settings.tavily_api_key,
        "query": query,
        "search_depth": "basic",
        "include_answer": False,
        "max_results": 15,
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

    for item in data.get("results") or []:
        url = item.get("url") or ""
        title = item.get("title") or ""
        content = item.get("content") or ""
        if not url:
            continue
        aid = hashlib.sha256(f"tavily|{url}".encode("utf-8")).hexdigest()[:32]
        
        # Extract date from content or title
        published_at = _extract_date_from_content(content, title)
        
        out.append(
            NormalizedArticle(
                id=aid,
                source="TavilySCC",
                title=title.strip() or url,
                url=url.strip(),
                summary_hint=str(content)[:500],
                published_at=published_at,
                fetched_at=datetime.now(UTC),
                raw_excerpt=content[:2000] if content else None,
                kind="tavily",
            )
        )
    return out
