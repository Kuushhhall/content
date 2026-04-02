import hashlib
import logging
from datetime import UTC, datetime, timedelta

import httpx

from app.core.config import Settings
from app.models.article import NormalizedArticle

log = logging.getLogger(__name__)

TAVILY_SEARCH_URL = "https://api.tavily.com/search"

LEGAL_SOURCES = [
    "livelaw.in",
    "barandbench.com",
    "economictimes.indiatimes.com",
    "indialegallive.com",
    "scconline.com",
    "lawstreet.in",
    "thehindu.com",
]

PDF_EXTENSIONS = (".pdf", ".PDF")
PDF_INDICATORS = ["pdf", "/pdf/", "document/", "file/"]


def _is_pdf(url: str) -> bool:
    if url.endswith(PDF_EXTENSIONS):
        return True
    if any(ind in url.lower() for ind in PDF_INDICATORS):
        return True
    return False


def search_tavily(
    settings: Settings,
    query: str,
    max_results: int = 10,
    days_back: int = 3,
) -> list[NormalizedArticle]:
    """Search Tavily for legal news articles. Filters out PDFs."""
    if not settings.tavily_api_key:
        raise ValueError("TAVILY_API_KEY not configured")

    now = datetime.now(UTC)
    start_date = (now - timedelta(days=days_back)).strftime("%Y-%m-%d")

    payload = {
        "api_key": settings.tavily_api_key,
        "query": query[:395],
        "search_depth": "advanced",
        "topic": "general",
        "include_answer": True,
        "max_results": max_results,
        "include_images": True,
        "include_raw_content": True,
        "include_domains": LEGAL_SOURCES,
        "days": days_back,
    }

    try:
        with httpx.Client(timeout=30.0) as client:
            r = client.post(TAVILY_SEARCH_URL, json=payload)
            r.raise_for_status()
            data = r.json()
            raw_results = data.get("results") or []
    except Exception:
        log.exception("Tavily search failed for query: %s", query[:50])
        return []

    raw_images = data.get("images") or []
    top_images = [
        img if isinstance(img, str) else img.get("url", "")
        for img in raw_images
        if (img if isinstance(img, str) else img.get("url", ""))
    ]

    out: list[NormalizedArticle] = []
    for idx, item in enumerate(raw_results):
        url = (item.get("url") or "").strip()
        title = (item.get("title") or "").strip()

        if not url or not title:
            continue
        if _is_pdf(url):
            continue

        content = item.get("raw_content") or item.get("content") or ""
        if len(content) < 200:
            continue

        aid = hashlib.sha256(f"tavily|{url}".encode()).hexdigest()[:32]
        image_url = item.get("image") or (top_images[idx] if idx < len(top_images) else None)

        out.append(
            NormalizedArticle(
                id=aid,
                source=_domain_to_source(url),
                title=title,
                url=url,
                summary_hint=content[:600],
                full_content=content[:8000],
                full_content_fetched=True,
                fetched_at=now,
                kind="tavily",
                image_url=image_url,
            )
        )

    log.info("Tavily found %d articles for: %s", len(out), query[:40])
    return out


def _domain_to_source(url: str) -> str:
    domain_map = {
        "livelaw.in": "LiveLaw",
        "barandbench.com": "Bar and Bench",
        "economictimes.indiatimes.com": "ET Legal",
        "indiankanoon.org": "Indian Kanoon",
        "indialegallive.com": "IndiaLegalLive",
        "scconline.com": "SCC Online",
        "lawstreet.in": "LawStreet",
        "thehindu.com": "The Hindu",
    }
    for domain, name in domain_map.items():
        if domain in url:
            return name
    return "Tavily"
