import logging
from datetime import datetime
from typing import List, Union

from app.core.config import Settings
from app.sources import rss as rss_sources
from app.sources import tavily_client
from app.state.store import StateStore

log = logging.getLogger(__name__)


async def run_ingestion(session_or_store: Union[object, StateStore], settings: Settings) -> int:
    """Basic ingestion without LLM calls. Returns count of new/updated articles.
    
    Args:
        session_or_store: StateStore for in-memory storage
        settings: Application settings
    """
    # We only use StateStore for in-memory storage
    store = session_or_store
    
    count = 0
    
    # Fetch articles from RSS and Tavily
    articles = rss_sources.ingest_all_rss(settings)
    articles.extend(tavily_client.search_scc_legal_news(settings))
    
    # Basic processing pipeline (no LLM calls)
    if articles:
        # 1. Deduplicate articles
        articles = rss_sources.deduplicate_articles(articles)
        
        # 2. Score for virality (basic scoring without LLM)
        articles = rss_sources.score_articles_for_virality(articles)
    
    # Upsert processed articles
    for article in articles:
        existing = store.get_article(article.id)
        should_upsert = False

        if existing is None:
            should_upsert = True
        elif (existing.title != article.title or
              existing.url != article.url or
              existing.summary_hint != article.summary_hint or
              existing.full_content != article.full_content):
            should_upsert = True

        if should_upsert:
            store.upsert_article(article)
            count += 1

    log.info("Enhanced ingestion upserted %s articles", count)
    return count


