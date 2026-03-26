import logging
import traceback
from datetime import datetime, timezone

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from app.core.config import Settings
from app.scheduler.runner import run_safe
from app.workflows import ingest as ingest_workflow
from app.workflows import publish as publish_workflow

log = logging.getLogger(__name__)


def build_scheduler(settings: Settings, get_store) -> AsyncIOScheduler:
    """
    get_store: zero-arg callable returning StateStore (for fresh reference on each tick).
    """
    scheduler = AsyncIOScheduler(timezone=timezone.utc)

    async def ingest_tick() -> None:
        from app.database import get_database
        
        db = get_database()
        if db:
            # Use PostgreSQL database session
            try:
                log.debug("Job start: ingest (PostgreSQL)")
                async with db.session() as session:
                    await ingest_workflow.run_ingestion(session, settings)
                    await session.commit()
                log.debug("Job done: ingest (PostgreSQL)")
            except Exception:
                log.error("Job failed: ingest (PostgreSQL)\n%s", traceback.format_exc())
        else:
            # Fallback to in-memory store
            store = get_store()
            try:
                log.debug("Job start: ingest (in-memory)")
                await ingest_workflow.run_ingestion(store, settings)
                log.debug("Job done: ingest (in-memory)")
            except Exception:
                log.error("Job failed: ingest (in-memory)\n%s", traceback.format_exc())

    async def publish_tick() -> None:
        store = get_store()
        try:
            log.debug("Job start: publish_due")
            publish_workflow.run_due_schedules(store, settings)
            log.debug("Job done: publish_due")
        except Exception:
            log.error("Job failed: publish_due\n%s", traceback.format_exc())

    # Cron-style: every N minutes
    scheduler.add_job(
        ingest_tick,
        CronTrigger(minute=f"*/{max(1, min(settings.ingest_cron_minutes, 59))}"),
        id="ingest_rss_tavily",
        replace_existing=True,
    )
    scheduler.add_job(
        publish_tick,
        IntervalTrigger(seconds=max(15, settings.publish_scan_interval_seconds)),
        id="publish_scan",
        replace_existing=True,
    )

    log.info(
        "Scheduler configured: ingest every %s min, publish scan every %ss",
        settings.ingest_cron_minutes,
        settings.publish_scan_interval_seconds,
    )
    return scheduler


def utc_now() -> datetime:
    return datetime.now(timezone.utc)
