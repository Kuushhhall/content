import hashlib
import logging
from datetime import datetime
from email.utils import parsedate_to_datetime
from typing import List
import feedparser
import requests
from bs4 import BeautifulSoup

from app.core.config import Settings
from app.models.article import NormalizedArticle
from app.services.content_intelligence import ContentIntelligenceService
from app.llm.service import LLMService

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
        ("Supreme Court India", settings.rss_supreme_court),
        ("High Courts", settings.rss_high_courts),
    ]
    combined: list[NormalizedArticle] = []
    for label, url in feeds:
        if url:  # Only fetch if URL is configured
            try:
                combined.extend(fetch_feed(label, url))
            except Exception:
                log.exception("RSS failed for %s", label)
    return combined


def fetch_full_article_content(article: NormalizedArticle) -> str:
    """Fetch full article content from the URL"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        response = requests.get(article.url, headers=headers, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Remove common unwanted elements
        for element in soup(['script', 'style', 'nav', 'header', 'footer', 'aside', 'advertisement', 'comments']):
            element.decompose()
        
        # Try to find main content areas
        content_selectors = [
            'article', 'main', '.content', '.article-content', '.post-content',
            '.entry-content', '.story-content', '.news-content', '.article-body',
            '.post-body', '.entry-body', '.story-body', '.news-body'
        ]
        
        content = ""
        for selector in content_selectors:
            elements = soup.select(selector)
            if elements:
                for element in elements:
                    text = element.get_text(strip=True)
                    if len(text) > 200:  # Only consider if substantial content
                        content = text
                        break
                if content:
                    break
        
        # If no specific content found, get all text
        if not content:
            content = soup.get_text(strip=True)
        
        # Clean up the content
        content = ' '.join(content.split())  # Remove extra whitespace
        
        # Limit content length
        if len(content) > 10000:
            content = content[:10000]
        
        return content
        
    except Exception as e:
        log.warning(f"Failed to fetch full content for {article.url}: {e}")
        return ""


def deduplicate_articles(articles: List[NormalizedArticle]) -> List[NormalizedArticle]:
    """Remove duplicate articles based on content similarity"""
    if not articles:
        return []
    
    # Sort by publication date (newest first)
    articles.sort(key=lambda x: x.published_at or datetime.min, reverse=True)
    
    unique_articles = []
    seen_content = set()
    
    for article in articles:
        # Create content fingerprint
        content_fingerprint = hashlib.md5(
            (article.title + article.summary_hint).lower().encode()
        ).hexdigest()
        
        if content_fingerprint not in seen_content:
            seen_content.add(content_fingerprint)
            unique_articles.append(article)
    
    return unique_articles


def score_articles_for_virality(articles: List[NormalizedArticle]) -> List[NormalizedArticle]:
    """Score articles based on virality potential"""
    virality_keywords = [
        'supreme court', 'high court', 'judgment', 'ruling', 'landmark', 'historic',
        'controversial', 'breaking', 'exclusive', 'scandal', 'fraud', 'corruption',
        'startup', 'tech', 'ai', 'crypto', 'blockchain', 'fintech', 'unicorn',
        'government', 'policy', 'regulation', 'law', 'act', 'bill', 'amendment'
    ]
    
    for article in articles:
        score = 0.0
        content_lower = (article.title + ' ' + article.summary_hint).lower()
        
        # Base score based on source credibility
        if article.source in ['LiveLaw', 'BarAndBench']:
            score += 0.3
        
        # Keyword scoring
        for keyword in virality_keywords:
            if keyword in content_lower:
                score += 0.1
        
        # Title length optimization
        title_length = len(article.title)
        if 40 <= title_length <= 70:  # Optimal title length
            score += 0.2
        
        # Recency bonus
        if article.published_at:
            hours_old = (datetime.now() - article.published_at).total_seconds() / 3600
            if hours_old < 24:  # Less than 24 hours old
                score += 0.2
            elif hours_old < 72:  # Less than 3 days old
                score += 0.1
        
        # Cap score between 0 and 1
        article.content_intelligence.virality_score = min(max(score, 0.0), 1.0)
    
    return articles


async def process_articles_with_intelligence(articles: List[NormalizedArticle], 
                                            llm_service: LLMService) -> List[NormalizedArticle]:
    """Process articles with content intelligence"""
    intelligence_service = ContentIntelligenceService(llm_service)
    
    processed_articles = []
    for article in articles:
        try:
            # Fetch full content
            article.full_content = fetch_full_article_content(article)
            
            # Process with content intelligence
            processed_article = await intelligence_service.process_article(article)
            processed_articles.append(processed_article)
            
        except Exception as e:
            log.error(f"Error processing article {article.id}: {e}")
            processed_articles.append(article)
    
    return processed_articles
