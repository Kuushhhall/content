"""Draft repository for database operations."""

import logging

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.db_models import DraftDB

log = logging.getLogger(__name__)


class DraftRepository:
    """Repository for draft database operations."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, draft_id: str) -> DraftDB | None:
        """Get draft by ID. O(log n) via primary key."""
        return await self.session.get(DraftDB, draft_id)

    async def list_drafts(
        self,
        article_id: str | None = None,
        platform: str | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> tuple[list[DraftDB], int]:
        """List drafts with filtering and pagination. O(log n) via indexes."""
        stmt = select(DraftDB)
        count_stmt = select(func.count(DraftDB.id))

        if article_id:
            stmt = stmt.where(DraftDB.article_id == article_id)
            count_stmt = count_stmt.where(DraftDB.article_id == article_id)
        if platform:
            stmt = stmt.where(DraftDB.platform == platform)
            count_stmt = count_stmt.where(DraftDB.platform == platform)

        stmt = stmt.order_by(DraftDB.updated_at.desc())
        stmt = stmt.limit(limit).offset(offset)

        result = await self.session.execute(stmt)
        total = await self.session.execute(count_stmt)

        return list(result.scalars().all()), total.scalar() or 0

    async def upsert(self, draft: DraftDB) -> DraftDB:
        """Insert or update draft. O(log n) index update."""
        existing = await self.get_by_id(draft.id)
        if existing:
            for key, value in draft.__dict__.items():
                if not key.startswith("_"):
                    setattr(existing, key, value)
            await self.session.flush()
            return existing
        else:
            self.session.add(draft)
            await self.session.flush()
            return draft

    async def delete(self, draft_id: str) -> bool:
        """Delete draft by ID. O(log n) index update."""
        draft = await self.get_by_id(draft_id)
        if draft:
            await self.session.delete(draft)
            await self.session.flush()
            return True
        return False

    async def count_by_platform(self) -> dict[str, int]:
        """Count drafts by platform. O(log n) via index scan."""
        stmt = select(DraftDB.platform, func.count(DraftDB.id)).group_by(
            DraftDB.platform
        )
        result = await self.session.execute(stmt)
        return {row[0]: row[1] for row in result.all()}