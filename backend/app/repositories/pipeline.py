"""Pipeline repository for database operations."""

import logging

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.db_models import PipelineRunDB, AppSettingDB, PipelineStatus

log = logging.getLogger(__name__)


class PipelineRepository:
    """Repository for pipeline run and app settings database operations."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    # --- Pipeline Runs ---

    async def get_run_by_id(self, run_id: str) -> PipelineRunDB | None:
        """Get pipeline run by ID. O(log n) via primary key."""
        return await self.session.get(PipelineRunDB, run_id)

    async def list_runs(
        self,
        status: str | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> tuple[list[PipelineRunDB], int]:
        """List pipeline runs with filtering and pagination. O(log n) via indexes."""
        stmt = select(PipelineRunDB)
        count_stmt = select(func.count(PipelineRunDB.id))

        if status:
            stmt = stmt.where(PipelineRunDB.status == status)
            count_stmt = count_stmt.where(PipelineRunDB.status == status)

        stmt = stmt.order_by(PipelineRunDB.started_at.desc())
        stmt = stmt.limit(limit).offset(offset)

        result = await self.session.execute(stmt)
        total = await self.session.execute(count_stmt)

        return list(result.scalars().all()), total.scalar() or 0

    async def get_current_run(self) -> PipelineRunDB | None:
        """Get the currently running pipeline. O(log n) via status index."""
        stmt = (
            select(PipelineRunDB)
            .where(PipelineRunDB.status == PipelineStatus.running)
            .order_by(PipelineRunDB.started_at.desc())
            .limit(1)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def upsert_run(self, run: PipelineRunDB) -> PipelineRunDB:
        """Insert or update pipeline run. O(log n) index update."""
        existing = await self.get_run_by_id(run.id)
        if existing:
            for key, value in run.__dict__.items():
                if not key.startswith("_"):
                    setattr(existing, key, value)
            await self.session.flush()
            return existing
        else:
            self.session.add(run)
            await self.session.flush()
            return run

    # --- App Settings ---

    async def get_setting(self, key: str) -> str | None:
        """Get app setting by key. O(log n) via primary key."""
        stmt = select(AppSettingDB.value).where(AppSettingDB.key == key)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def set_setting(self, key: str, value: str) -> None:
        """Set app setting. O(log n) index update."""
        existing = await self.session.get(AppSettingDB, key)
        if existing:
            existing.value = value
        else:
            self.session.add(AppSettingDB(key=key, value=value))
        await self.session.flush()

    async def get_pipeline_mode(self) -> str:
        """Get pipeline mode. O(log n) via primary key."""
        mode = await self.get_setting("pipeline_mode")
        return mode or "manual"

    async def set_pipeline_mode(self, mode: str) -> None:
        """Set pipeline mode. O(log n) index update."""
        await self.set_setting("pipeline_mode", mode)

    async def get_auto_reply_enabled(self) -> bool:
        """Get auto-reply setting. O(log n) via primary key."""
        enabled = await self.get_setting("auto_reply_enabled")
        return enabled == "true"

    async def set_auto_reply_enabled(self, enabled: bool) -> None:
        """Set auto-reply setting. O(log n) index update."""
        await self.set_setting("auto_reply_enabled", "true" if enabled else "false")