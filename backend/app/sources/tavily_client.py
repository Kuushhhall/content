import hashlib
import logging
from datetime import UTC, datetime

import httpx

from app.core.config import Settings
from app.models.article import NormalizedArticle

log = logging.getLogger(__name__)

TAVILY_SEARCH_URL = "https://api.tavily.com/search"


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
        out.append(
            NormalizedArticle(
                id=aid,
                source="TavilySCC",
                title=title.strip() or url,
                url=url.strip(),
                summary_hint=str(content)[:500],
                published_at=None,
                fetched_at=datetime.now(UTC),
                raw_excerpt=content[:2000] if content else None,
                kind="tavily",
            )
        )
    return out
