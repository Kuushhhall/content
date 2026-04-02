import hashlib
import logging
from datetime import UTC, datetime, timedelta
from typing import List, Optional

import feedparser
import httpx
from app.models.article import NormalizedArticle


log = logging.getLogger(__name__)

# Authoritative Indian legal news RSS feeds
RSS_FEEDS = {
    "LiveLaw": "https://www.livelaw.in/feed",
    "Bar and Bench": "https://www.barandbench.com/feed",
    "IndiaLegalLive": "https://www.indialegallive.com/feed",
    "ET Legal": "https://legal.economictimes.indiatimes.com/rss/all",
    "Indian Kanoon": "https://indiankanoon.org/feeds/latest/",
}

COMMON_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)


def fetch_rss_candidates(days_back: int = 1) -> List[NormalizedArticle]:
    """Fetch recent articles from authoritative legal RSS feeds.
    
    Acts as a high-authority Discovery Phase for the news pipeline.
    """
    now = datetime.now(UTC)
    cutoff_date = now - timedelta(days=days_back)
    
    candidates: List[NormalizedArticle] = []
    
    for source_name, feed_url in RSS_FEEDS.items():
        try:
            log.info("RSS: Fetching feed for %s: %s", source_name, feed_url)
            
            # Use httpx to fetch with a user-agent to avoid 403s
            with httpx.Client(timeout=15.0, follow_redirects=True) as client:
                response = client.get(feed_url, headers={"User-Agent": COMMON_USER_AGENT})
                response.raise_for_status()
                feed = feedparser.parse(response.content)
            
            if not feed.entries:
                log.warning("RSS: No entries found in feed for %s", source_name)
                continue
            
            source_count = 0
            for entry in feed.entries:
                url = (entry.link or "").strip()
                title = (entry.title or "").strip()
                summary = entry.get("summary", "") or entry.get("description", "")
                
                if not url or not title:
                    continue
                
                # Parse publication date
                published_at = None
                if hasattr(entry, "published_parsed") and entry.published_parsed:
                    published_at = datetime(*entry.published_parsed[:6], tzinfo=UTC)
                elif hasattr(entry, "updated_parsed") and entry.updated_parsed:
                    published_at = datetime(*entry.updated_parsed[:6], tzinfo=UTC)
                
                # Filter by date
                if published_at and published_at < cutoff_date:
                    continue
                
                # Deduplicate/ID generation
                aid = hashlib.sha256(f"rss|{url}".encode("utf-8")).hexdigest()[:32]
                
                # Thumbnail image if available (media_content or common enclosures)
                image_url = None
                if hasattr(entry, "media_content") and entry.media_content:
                     image_url = entry.media_content[0].get("url")
                elif hasattr(entry, "links"):
                    for link in entry.links:
                        if link.get("type", "").startswith("image/"):
                            image_url = link.get("href")
                            break
                
                candidates.append(
                    NormalizedArticle(
                        id=aid,
                        source=source_name,
                        title=title,
                        url=url,
                        summary_hint=str(summary)[:1000],
                        published_at=published_at,
                        fetched_at=now,
                        full_content_fetched=False, # Must be scraped surgicially
                        kind="rss",
                        image_url=image_url,
                    )
                )
                source_count += 1
                
            log.info("RSS: Gathered %d candidates from %s", source_count, source_name)
            
        except Exception as e:
            log.error("RSS: Failed to fetch/parse feed for %s: %s", source_name, e)
            
    return candidates
