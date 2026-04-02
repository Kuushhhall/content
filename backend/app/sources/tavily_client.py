import hashlib
import logging
from datetime import UTC, datetime

from exa_py import Exa

from app.core.config import Settings
from app.models.article import NormalizedArticle

log = logging.getLogger(__name__)

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
PDF_INDICATORS = ["/pdf/", "/document/", "/file/"]

INDEX_PATTERNS = [
    "/archives", "/archive/", "/page/2", "/page/3", "/page/4", "/page/5",
    "/category/", "/categories/", "/tag/", "/tags/", "/topics/", "/topic/",
    "/feed", "/rss", "/latest-news/", "/legal-news/",
    "/supreme-court/", "/high-court/", "/case-status",
    "/all-news", "/all-stories", "/top-stories",
    "/recent-news", "/recent-updates",
    "/year-ender", "/roundup", "/round-up", "/compilation",
    "/digest", "/weekly-digest", "/monthly-digest",
    "/know-thy-judge", "/judge-profile",
    "/digit-latest-news", "/recent-digit-updates",
    "/civil-courts-vs-nclt", "/nclt-jurisdiction",
    "/legal-mantra", "/brought-to-you-by",
    "/corporate-legal-news", "/corporate-litigation",
    "/fundamental-right-archives",
    "/shrinking-realm", "/budget-", "/union-budget", "/finance-minister",
    "/latest-supreme-court-news", "/latest-supreme-court-judgments",
]


def _is_pdf(url: str) -> bool:
    if url.endswith(PDF_EXTENSIONS):
        return True
    if any(ind in url.lower() for ind in PDF_INDICATORS):
        return True
    return False


def _is_index_page(url: str, title: str) -> bool:
    url_lower = url.lower()
    title_lower = title.lower()

    for pattern in INDEX_PATTERNS:
        if pattern in url_lower:
            log.debug("Index page detected (URL '%s'): %s", pattern, url[:80])
            return True

    if title_lower.startswith("latest ") and ("news" in title_lower or "judgments" in title_lower):
        return True

    word_count = len(title.split())
    if word_count < 3:
        return True

    return False


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
    return "Exa"


async def search_exa_async(
    settings: Settings,
    query: str,
    max_results: int = 10,
    days_back: int = 3,
) -> list[NormalizedArticle]:
    """Search Exa for legal news articles. Returns full content with highlights."""
    now = datetime.now(UTC)
    log.info("Exa search: %s (max_results=%d, days=%d)", query[:60], max_results, days_back)

    exa = Exa(api_key="fc88c96e-6d4d-47ad-b042-9a98e1e4724e")

    try:
        results = exa.search_and_contents(
            query,
            type="auto",
            num_results=max_results * 2,
            include_domains=LEGAL_SOURCES,
            highlights={"max_characters": 4000},
        )
        raw_results = results.results or []
    except Exception:
        log.exception("Exa search failed for query: %s", query[:50])
        return []

    out: list[NormalizedArticle] = []
    skipped_index = 0
    skipped_pdf = 0

    for item in raw_results:
        url = (getattr(item, "url") or "").strip()
        title = (getattr(item, "title") or "").strip()

        if not url or not title:
            continue

        if _is_pdf(url):
            skipped_pdf += 1
            continue

        if _is_index_page(url, title):
            skipped_index += 1
            continue

        highlights = getattr(item, "highlights", None) or []
        content = "\n\n".join(highlights) if highlights else (getattr(item, "text", "") or "")

        if len(content) < 200:
            continue

        aid = hashlib.sha256(f"exa|{url}".encode()).hexdigest()[:32]

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
                image_url=getattr(item, "image", None),
            )
        )

        if len(out) >= max_results:
            break

    log.info(
        "Exa: %d articles kept, %d index pages skipped, %d PDFs skipped",
        len(out), skipped_index, skipped_pdf,
    )
    return out
