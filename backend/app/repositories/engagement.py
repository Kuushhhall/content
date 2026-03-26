"""Engagement repository for database operations."""

import logging

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.db_models import EngagementCommentDB, PublishResultDB, CommentStatus

log = logging.getLogger(__name__)


class EngagementRepository:
    """Repository for engagement and publish result database operations."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    # --- Comments ---

    async def get_comment_by_id(self, comment_id: str) -> EngagementCommentDB | None:
        """Get comment by ID. O(log n) via primary key."""
        return await self.session.get(EngagementCommentDB, comment_id)

    async def list_comments(
        self,
        platform: str | None = None,
        status: str | None = None,
        article_id: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[EngagementCommentDB], int]:
        """List comments with filtering and pagination. O(log n) via indexes."""
        stmt = select(EngagementCommentDB)
        count_stmt = select(func.count(EngagementCommentDB.id))

        if platform:
            stmt = stmt.where(EngagementCommentDB.platform == platform)
            count_stmt = count_stmt.where(EngagementCommentDB.platform == platform)
        if status:
            stmt = stmt.where(EngagementCommentDB.status == status)
            count_stmt = count_stmt.where(EngagementCommentDB.status == status)
        if article_id:
            stmt = stmt.where(EngagementCommentDB.article_id == article_id)
            count_stmt = count_stmt.where(EngagementCommentDB.article_id == article_id)

        stmt = stmt.order_by(EngagementCommentDB.created_at.desc())
        stmt = stmt.limit(limit).offset(offset)

        result = await self.session.execute(stmt)
        total = await self.session.execute(count_stmt)

        return list(result.scalars().all()), total.scalar() or 0

    async def upsert_comment(self, comment: EngagementCommentDB) -> EngagementCommentDB:
        """Insert or update comment. O(log n) index update."""
        existing = await self.get_comment_by_id(comment.id)
        if existing:
            for key, value in comment.__dict__.items():
                if not key.startswith("_"):
                    setattr(existing, key, value)
            await self.session.flush()
            return existing
        else:
            self.session.add(comment)
            await self.session.flush()
            return comment

    async def update_comment_status(
        self, comment_id: str, status: CommentStatus
    ) -> bool:
        """Update comment status. O(log n) index update."""
        comment = await self.get_comment_by_id(comment_id)
        if comment:
            comment.status = status
            await self.session.flush()
            return True
        return False

    # --- Publish Results ---

    async def append_publish_result(self, result: PublishResultDB) -> PublishResultDB:
        """Append a publish result. O(log n) index update."""
        self.session.add(result)
        await self.session.flush()
        return result

    async def list_publish_results(
        self,
        platform: str | None = None,
        success: bool | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[PublishResultDB], int]:
        """List publish results with filtering and pagination. O(log n) via indexes."""
        stmt = select(PublishResultDB)
        count_stmt = select(func.count(PublishResultDB.id))

        if platform:
            stmt = stmt.where(PublishResultDB.platform == platform)
            count_stmt = count_stmt.where(PublishResultDB.platform == platform)
        if success is not None:
            stmt = stmt.where(PublishResultDB.success == success)
            count_stmt = count_stmt.where(PublishResultDB.success == success)

        stmt = stmt.order_by(PublishResultDB.at.desc())
        stmt = stmt.limit(limit).offset(offset)

        result = await self.session.execute(stmt)
        total = await self.session.execute(count_stmt)

        return list(result.scalars().all()), total.scalar() or 0

    async def get_analytics_overview(self) -> dict:
        """Get analytics overview. O(log n) via aggregate index."""
        total_stmt = select(func.count(PublishResultDB.id))
        success_stmt = select(func.count(PublishResultDB.id)).where(
            PublishResultDB.success == True
        )
        failed_stmt = select(func.count(PublishResultDB.id)).where(
            PublishResultDB.success == False
        )
        by_platform_stmt = (
            select(PublishResultDB.platform, func.count(PublishResultDB.id))
            .group_by(PublishResultDB.platform)
        )

        total = (await self.session.execute(total_stmt)).scalar() or 0
        success = (await self.session.execute(success_stmt)).scalar() or 0
        failed = (await self.session.execute(failed_stmt)).scalar() or 0
        by_platform_result = await self.session.execute(by_platform_stmt)

        return {
            "total_posts": total,
            "success_posts": success,
            "failed_posts": failed,
            "success_rate": success / total if total > 0 else 0.0,
            "by_platform": {row[0]: row[1] for row in by_platform_result.all()},
        }