import logging
from datetime import datetime
from typing import List, Union

from app.core.config import Settings
from app.sources import rss as rss_sources
from app.sources import tavily_client
from app.state.store import StateStore
from app.llm.service import LLMService

log = logging.getLogger(__name__)


async def run_ingestion_enhanced(session_or_store: Union[object, StateStore], settings: Settings, llm_service: LLMService) -> int:
    """Enhanced ingestion with content intelligence. Returns count of new/updated articles.
    
    Args:
        session_or_store: Either an AsyncSession (for PostgreSQL) or StateStore (for in-memory)
        settings: Application settings
        llm_service: LLM service for content intelligence
    """
    from sqlalchemy.ext.asyncio import AsyncSession
    from app.repositories.articles import ArticleRepository
    from app.models.db_models import ArticleDB
    
    # Determine if we have a database session or StateStore
    use_db = isinstance(session_or_store, AsyncSession)
    if use_db:
        repo = ArticleRepository(session_or_store)
    else:
        store = session_or_store
    
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
        if use_db:
            # Check if article exists in PostgreSQL
            existing = await repo.get_by_id(article.id)
            should_upsert = False
            
            if existing is None:
                should_upsert = True
            elif (existing.title != article.title or 
                  existing.url != article.url or 
                  existing.summary_hint != article.summary_hint or
                  existing.full_content != article.full_content):
                should_upsert = True
            
            if should_upsert:
                # Convert NormalizedArticle to ArticleDB
                db_article = ArticleDB(
                    id=article.id,
                    source=article.source,
                    title=article.title,
                    url=article.url,
                    summary_hint=article.summary_hint,
                    published_at=article.published_at,
                    fetched_at=article.fetched_at,
                    raw_excerpt=article.raw_excerpt,
                    kind=article.kind,
                    full_content=article.full_content,
                    structured_summary=article.structured_summary,
                    extracted_facts=article.extracted_facts,
                    court_name=article.court_name,
                    case_number=article.case_number,
                    judges_involved=article.judges_involved,
                    parties=article.parties,
                    jurisdiction=article.jurisdiction,
                    precedent_value=article.precedent_value,
                    ci_topic=article.content_intelligence.topic,
                    ci_legal_area=article.content_intelligence.legal_area,
                    ci_audience=article.content_intelligence.audience,
                    ci_angle=article.content_intelligence.angle,
                    ci_complexity_level=article.content_intelligence.complexity_level,
                    ci_virality_score=article.content_intelligence.virality_score,
                    ci_relevance_score=article.content_intelligence.relevance_score,
                    ci_key_insights=article.content_intelligence.key_insights,
                    ci_affected_parties=article.content_intelligence.affected_parties,
                    ci_legal_implications=article.content_intelligence.legal_implications,
                    ci_suggested_hashtags=article.content_intelligence.suggested_hashtags,
                )
                await repo.upsert(db_article)
                count += 1
        else:
            # Fallback to in-memory store
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
    
    log.info("Enhanced ingestion upserted %s articles (db=%s)", count, use_db)
    return count


async def run_ingestion(session_or_store: Union[object, StateStore], settings: Settings) -> int:
    """Ingestion with deduplication, virality scoring, and intelligence extraction."""
    # Create LLM service - pass store if available, otherwise None
    if isinstance(session_or_store, StateStore):
        llm_service = LLMService(settings, session_or_store)
    else:
        # For database mode, we need a store for LLM service
        # Create a temporary in-memory store for LLM caching
        from app.state.store import StateStore
        temp_store = StateStore(settings.state_path)
        llm_service = LLMService(settings, temp_store)
    
    return await run_ingestion_enhanced(session_or_store, settings, llm_service)
