import logging
from datetime import datetime
from typing import List

from app.core.config import Settings
from app.sources import rss as rss_sources
from app.sources import tavily_client
from app.state.store import StateStore
from app.llm.service import LLMService

log = logging.getLogger(__name__)


async def run_ingestion_enhanced(store: StateStore, settings: Settings, llm_service: LLMService) -> int:
    """Enhanced ingestion with content intelligence. Returns count of new/updated articles."""
    count = 0
    
    # Fetch articles from RSS and Tavily
    articles = rss_sources.ingest_all_rss(settings)
    articles.extend(tavily_client.search_scc_legal_news(settings))
    
    # Enhanced processing pipeline
    if articles:
        # 1. Deduplicate articles
        articles = rss_sources.deduplicate_articles(articles)
        
        # 2. Score for virality
        articles = rss_sources.score_articles_for_virality(articles)
        
        # 3. Process with content intelligence
        articles = await rss_sources.process_articles_with_intelligence(articles, llm_service)
    
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


async def run_ingestion(store: StateStore, settings: Settings) -> int:
    """Ingestion with deduplication, virality scoring, and intelligence extraction."""
    llm_service = LLMService(settings, store)
    return await run_ingestion_enhanced(store, settings, llm_service)
