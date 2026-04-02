import logging
import re

import httpx
from bs4 import BeautifulSoup

log = logging.getLogger(__name__)

MAX_CONTENT_LENGTH = 15000

# Ordered list of CSS selectors for main article content
# Target body content across major legal portals
CONTENT_SELECTORS = [
    # General article/body tags
    'article', 'main', '.article-content', '.post-content', '.entry-content',
    '.story-content', '.news-content', '.article-body', '.post-body',
    '#article-body', '#maincontent', '#content',
    
    # LiveLaw specialized
    '.article-content', '#maincontent',
    
    # Bar and Bench
    '.story-content', '.content-wrapper',
    
    # ET Legal
    '.artText', '.article-text',
    
    # IndiaLegalLive
    '.td-post-content',
]

UNWANTED_TAGS = [
    'script', 'style', 'nav', 'header', 'footer', 'aside',
    'advertisement', 'comments', 'sidebar', 'menu', 'form',
    'noscript', 'iframe',
]


def clean_content(content: str) -> str:
    """Normalize extracted text — collapse whitespace, remove repetitive 'Read More' patterns."""
    if not content:
        return ""
    # Remove repetitive patterns common in legal news sites
    content = re.sub(r'Also\s+read:.*?(?=\s|$)', '', content, flags=re.IGNORECASE)
    content = re.sub(r'Read\s+more:.*?(?=\s|$)', '', content, flags=re.IGNORECASE)
    content = re.sub(r'Check\s+out:.*?(?=\s|$)', '', content, flags=re.IGNORECASE)
    
    content = re.sub(r'\s+', ' ', content)
    content = re.sub(r'\.{2,}', '.', content)
    return content.strip()


async def fetch_full_article_content(url: str, fallback: str = "", timeout: int = 15) -> str:
    """Fetch and extract full article content from URL using BeautifulSoup.

    Returns the cleaned article body. Falls back to `fallback` if fetch fails
    or extracted content is too short to be useful.
    """
    headers = {
        'User-Agent': (
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
            'AppleWebKit/537.36 (KHTML, like Gecko) '
            'Chrome/120.0.0.0 Safari/537.36'
        ),
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
    }

    try:
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()

            soup = BeautifulSoup(response.content, 'html.parser')

            # Strip boilerplate elements
            for tag in soup(UNWANTED_TAGS):
                tag.decompose()

            content = ""

            # Strategy 1: Known article content selectors
            for selector in CONTENT_SELECTORS:
                elements = soup.select(selector)
                for element in elements:
                    text = element.get_text(separator=' ', strip=True)
                    if len(text) > 300:
                        content = text
                        break
                if content:
                    break

            # Strategy 2: Collect all substantial paragraphs
            if not content:
                paragraphs = []
                for p in soup.find_all('p'):
                    text = p.get_text(strip=True)
                    if len(text) > 40:
                        paragraphs.append(text)
                if paragraphs:
                    content = ' '.join(paragraphs)

            # Strategy 3: Full body text
            if not content:
                content = soup.get_text(separator=' ', strip=True)

            content = clean_content(content)

            # If extracted content is too short, use fallback
            if len(content) < 200:
                log.warning("Extracted content too short for %s, using fallback", url)
                return clean_content(fallback) if fallback else content

            # Truncate to limit
            if len(content) > MAX_CONTENT_LENGTH:
                content = content[:MAX_CONTENT_LENGTH]

            return content

    except Exception as e:
        log.warning("Failed to fetch full content for %s: %s", url, e)
        return clean_content(fallback) if fallback else ""
