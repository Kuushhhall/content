"""Article repository for database operations."""

import logging
from datetime import datetime

from sqlalchemy import func, select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.db_models import ArticleDB, ArticleSummaryDB

log = logging.getLogger(__name__)


class ArticleRepository:
    """Repository for article database operations."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, article_id: str) -> ArticleDB | None:
        """Get article by ID. O(log n) via B-tree index."""
        return await self.session.get(ArticleDB, article_id)

    async def get_by_url(self, url: str) -> ArticleDB | None:
        """Get article by URL. O(log n) via unique index."""
        stmt = select(ArticleDB).where(ArticleDB.url == url)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_articles(
        self,
        source: str | None = None,
        kind: str | None = None,
        min_virality: float = 0.0,
        sort_by: str = "published_at",
        order: str = "desc",
        limit: int = 20,
        offset: int = 0,
    ) -> tuple[list[ArticleDB], int]:
        """List articles with filtering, sorting, and pagination. O(log n) via indexes."""
        stmt = select(ArticleDB)
        count_stmt = select(func.count(ArticleDB.id))

        if source:
            stmt = stmt.where(ArticleDB.source == source)
            count_stmt = count_stmt.where(ArticleDB.source == source)
        if kind:
            stmt = stmt.where(ArticleDB.kind == kind)
            count_stmt = count_stmt.where(ArticleDB.kind == kind)
        if min_virality > 0:
            stmt = stmt.where(ArticleDB.ci_virality_score >= min_virality)
            count_stmt = count_stmt.where(ArticleDB.ci_virality_score >= min_virality)

        # Sorting (uses index)
        sort_col = getattr(ArticleDB, sort_by, ArticleDB.published_at)
        stmt = stmt.order_by(sort_col.desc() if order == "desc" else sort_col.asc())

        # Pagination
        stmt = stmt.limit(limit).offset(offset)

        result = await self.session.execute(stmt)
        total = await self.session.execute(count_stmt)

        return list(result.scalars().all()), total.scalar() or 0

    async def search_articles(self, query: str, limit: int = 20) -> list[ArticleDB]:
        """Search articles by title or summary. O(log n) via trigram index."""
        stmt = (
            select(ArticleDB)
            .where(
                or_(
                    ArticleDB.title.ilike(f"%{query}%"),
                    ArticleDB.summary_hint.ilike(f"%{query}%"),
                )
            )
            .order_by(ArticleDB.ci_virality_score.desc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def upsert(self, article: ArticleDB) -> ArticleDB:
        """Insert or update article. O(log n) index update."""
        existing = await self.get_by_id(article.id)
        if existing:
            # Update existing
            for key, value in article.__dict__.items():
                if not key.startswith("_"):
                    setattr(existing, key, value)
            await self.session.flush()
            return existing
        else:
            self.session.add(article)
            await self.session.flush()
            return article

    async def delete(self, article_id: str) -> bool:
        """Delete article by ID. O(log n) index update."""
        article = await self.get_by_id(article_id)
        if article:
            await self.session.delete(article)
            await self.session.flush()
            return True
        return False

    async def get_summary(self, article_id: str) -> str | None:
        """Get cached LLM summary. O(log n) via primary key."""
        stmt = select(ArticleSummaryDB.summary).where(
            ArticleSummaryDB.article_id == article_id
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def set_summary(self, article_id: str, summary: str) -> None:
        """Cache LLM summary. O(log n) index update."""
        existing = await self.session.get(ArticleSummaryDB, article_id)
        if existing:
            existing.summary = summary
        else:
            self.session.add(ArticleSummaryDB(article_id=article_id, summary=summary))
        await self.session.flush()

    async def count_by_source(self) -> dict[str, int]:
        """Count articles by source. O(log n) via index scan."""
        stmt = select(ArticleDB.source, func.count(ArticleDB.id)).group_by(
            ArticleDB.source
        )
        result = await self.session.execute(stmt)
        return {row[0]: row[1] for row in result.all()}

    async def get_top_viral(self, limit: int = 10) -> list[ArticleDB]:
        """Get top viral articles. O(log n) via virality index."""
        stmt = (
            select(ArticleDB)
            .order_by(ArticleDB.ci_virality_score.desc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())