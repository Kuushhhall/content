import hashlib
import logging
from datetime import datetime
from email.utils import parsedate_to_datetime

import feedparser

from app.core.config import Settings
from app.models.article import NormalizedArticle

log = logging.getLogger(__name__)


def _entry_id(feed_url: str, link: str, title: str) -> str:
    raw = f"{feed_url}|{link}|{title}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:32]


def _parse_entry_published(entry: feedparser.FeedParserDict) -> datetime | None:
    for struct in (entry.get("published_parsed"), entry.get("updated_parsed")):
        if struct:
            try:
                return datetime(*struct[:6])
            except (TypeError, ValueError):
                pass
    for key in ("published", "updated"):
        val = entry.get(key)
        if isinstance(val, str):
            try:
                dt = parsedate_to_datetime(val)
                return dt.replace(tzinfo=None) if dt.tzinfo else dt
            except (TypeError, ValueError):
                pass
    return None


def fetch_feed(source_label: str, feed_url: str) -> list[NormalizedArticle]:
    log.debug("Fetching RSS: %s", feed_url)
    parsed = feedparser.parse(feed_url)
    out: list[NormalizedArticle] = []
    for entry in parsed.entries or []:
        link = (entry.get("link") or "").strip()
        title = (entry.get("title") or "").strip()
        if not link and not title:
            continue
        summary = entry.get("summary") or entry.get("description") or ""
        aid = _entry_id(feed_url, link, title)
        pub = _parse_entry_published(entry)
        out.append(
            NormalizedArticle(
                id=aid,
                source=source_label,
                title=title or "(untitled)",
                url=link,
                summary_hint=str(summary)[:500] if summary else "",
                published_at=pub,
                kind="rss",
            )
        )
    return out


def ingest_all_rss(settings: Settings) -> list[NormalizedArticle]:
    feeds = [
        ("LiveLaw", settings.rss_livelaw),
        ("BarAndBench", settings.rss_barandbench),
        ("IndiaLegalLive", settings.rss_indialegal),
    ]
    combined: list[NormalizedArticle] = []
    for label, url in feeds:
        try:
            combined.extend(fetch_feed(label, url))
        except Exception:
            log.exception("RSS failed for %s", label)
    return combined
