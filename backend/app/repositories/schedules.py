"""Schedule repository for database operations."""

import logging
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.db_models import ScheduleDB, ScheduleStatus

log = logging.getLogger(__name__)


class ScheduleRepository:
    """Repository for schedule database operations."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, schedule_id: str) -> ScheduleDB | None:
        """Get schedule by ID. O(log n) via primary key."""
        return await self.session.get(ScheduleDB, schedule_id)

    async def list_schedules(
        self,
        status: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[ScheduleDB], int]:
        """List schedules with filtering and pagination. O(log n) via indexes."""
        stmt = select(ScheduleDB)
        count_stmt = select(func.count(ScheduleDB.id))

        if status:
            stmt = stmt.where(ScheduleDB.status == status)
            count_stmt = count_stmt.where(ScheduleDB.status == status)

        stmt = stmt.order_by(ScheduleDB.run_at.asc())
        stmt = stmt.limit(limit).offset(offset)

        result = await self.session.execute(stmt)
        total = await self.session.execute(count_stmt)

        return list(result.scalars().all()), total.scalar() or 0

    async def get_due_schedules(self) -> list[ScheduleDB]:
        """Get schedules that are due for execution. O(log n) via composite index."""
        now = datetime.now(timezone.utc)
        stmt = (
            select(ScheduleDB)
            .where(
                ScheduleDB.status == ScheduleStatus.pending,
                ScheduleDB.run_at <= now,
            )
            .order_by(ScheduleDB.run_at.asc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def upsert(self, schedule: ScheduleDB) -> ScheduleDB:
        """Insert or update schedule. O(log n) index update."""
        existing = await self.get_by_id(schedule.id)
        if existing:
            for key, value in schedule.__dict__.items():
                if not key.startswith("_"):
                    setattr(existing, key, value)
            await self.session.flush()
            return existing
        else:
            self.session.add(schedule)
            await self.session.flush()
            return schedule

    async def delete(self, schedule_id: str) -> bool:
        """Delete schedule by ID. O(log n) index update."""
        schedule = await self.get_by_id(schedule_id)
        if schedule:
            await self.session.delete(schedule)
            await self.session.flush()
            return True
        return False

    async def count_by_status(self) -> dict[str, int]:
        """Count schedules by status. O(log n) via index scan."""
        stmt = select(ScheduleDB.status, func.count(ScheduleDB.id)).group_by(
            ScheduleDB.status
        )
        result = await self.session.execute(stmt)
        return {row[0].value: row[1] for row in result.all()}