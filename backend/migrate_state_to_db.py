"""Migrate articles from state.json to PostgreSQL database."""

import asyncio
import json
import logging
from pathlib import Path

from app.core.config import get_settings
from app.database import init_database, close_database, get_database
from app.models.db_models import ArticleDB, ArticleKind, ComplexityLevel, PrecedentValue
from app.models.article import NormalizedArticle

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)


def convert_article_to_db(article: NormalizedArticle) -> ArticleDB:
    """Convert NormalizedArticle to ArticleDB."""
    return ArticleDB(
        id=article.id,
        source=article.source,
        title=article.title,
        url=article.url,
        summary_hint=article.summary_hint or "",
        published_at=article.published_at,
        fetched_at=article.fetched_at,
        raw_excerpt=article.raw_excerpt,
        kind=ArticleKind(article.kind) if article.kind in [e.value for e in ArticleKind] else ArticleKind.rss,
        full_content=article.full_content or "",
        structured_summary=article.structured_summary or "",
        extracted_facts=article.extracted_facts or [],
        court_name=article.court_name or "",
        case_number=article.case_number or "",
        judges_involved=article.judges_involved or [],
        parties=article.parties or [],
        jurisdiction=article.jurisdiction or "",
        precedent_value=PrecedentValue(article.precedent_value) if article.precedent_value in [e.value for e in PrecedentValue] else PrecedentValue.medium,
        decision_date=article.decision_date,
        ci_topic=article.content_intelligence.topic or "",
        ci_legal_area=article.content_intelligence.legal_area or "",
        ci_audience=article.content_intelligence.audience or [],
        ci_angle=article.content_intelligence.angle or "",
        ci_complexity_level=ComplexityLevel(article.content_intelligence.complexity_level) if article.content_intelligence.complexity_level in [e.value for e in ComplexityLevel] else ComplexityLevel.intermediate,
        ci_virality_score=article.content_intelligence.virality_score or 0.0,
        ci_relevance_score=article.content_intelligence.relevance_score or 0.0,
        ci_key_insights=article.content_intelligence.key_insights or [],
        ci_affected_parties=article.content_intelligence.affected_parties or [],
        ci_legal_implications=article.content_intelligence.legal_implications or [],
        ci_suggested_hashtags=article.content_intelligence.suggested_hashtags or [],
    )


async def migrate_articles():
    """Migrate articles from state.json to PostgreSQL database."""
    settings = get_settings()
    
    # Load state.json - use correct path (backend/data/state.json)
    state_path = Path(__file__).resolve().parent / "data" / "state.json"
    if not state_path.exists():
        log.error(f"State file not found: {state_path}")
        return
    
    with open(state_path, "r", encoding="utf-8") as f:
        state_data = json.load(f)
    
    articles_list = state_data.get("articles", [])
    log.info(f"Found {len(articles_list)} articles in state.json")
    
    if not articles_list:
        log.info("No articles to migrate")
        return
    
    # Initialize database
    db = await init_database(settings)
    if not db:
        log.error("Failed to initialize database")
        return
    
    try:
        async with db.session() as session:
            from sqlalchemy import select, func
            
            # Check existing articles in database
            result = await session.execute(select(func.count(ArticleDB.id)))
            existing_count = result.scalar() or 0
            log.info(f"Found {existing_count} articles already in database")
            
            # Migrate articles
            migrated = 0
            skipped = 0
            
            for article_data in articles_list:
                try:
                    article_id = article_data.get("id")
                    if not article_id:
                        continue
                        
                    # Check if article already exists
                    existing = await session.get(ArticleDB, article_id)
                    if existing:
                        skipped += 1
                        continue
                    
                    # Convert to NormalizedArticle
                    from app.models.article import ContentIntelligence
                    ci_data = article_data.get("content_intelligence", {})
                    ci = ContentIntelligence(**ci_data) if ci_data else ContentIntelligence()
                    
                    article = NormalizedArticle(
                        id=article_data["id"],
                        source=article_data["source"],
                        title=article_data["title"],
                        url=article_data["url"],
                        summary_hint=article_data.get("summary_hint", ""),
                        published_at=article_data.get("published_at"),
                        fetched_at=article_data.get("fetched_at"),
                        raw_excerpt=article_data.get("raw_excerpt"),
                        kind=article_data.get("kind", "rss"),
                        full_content=article_data.get("full_content", ""),
                        structured_summary=article_data.get("structured_summary", ""),
                        extracted_facts=article_data.get("extracted_facts", []),
                        court_name=article_data.get("court_name", ""),
                        case_number=article_data.get("case_number", ""),
                        judges_involved=article_data.get("judges_involved", []),
                        parties=article_data.get("parties", []),
                        jurisdiction=article_data.get("jurisdiction", ""),
                        precedent_value=article_data.get("precedent_value", "medium"),
                        decision_date=article_data.get("decision_date"),
                        content_intelligence=ci,
                    )
                    
                    # Convert to DB model
                    db_article = convert_article_to_db(article)
                    session.add(db_article)
                    migrated += 1
                    
                    if migrated % 10 == 0:
                        log.info(f"Migrated {migrated} articles...")
                        
                except Exception as e:
                    log.error(f"Error migrating article {article_id}: {e}")
                    continue
            
            # Commit all changes
            await session.commit()
            log.info(f"Migration complete: {migrated} articles migrated, {skipped} skipped")
            
    except Exception as e:
        log.error(f"Migration failed: {e}")
        raise
    finally:
        await close_database()


if __name__ == "__main__":
    asyncio.run(migrate_articles())