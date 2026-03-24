import logging
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

    def ingest_tick() -> None:
        store = get_store()

        def _ingest() -> None:
            ingest_workflow.run_ingestion(store, settings)

        run_safe("ingest", _ingest)

    def publish_tick() -> None:
        store = get_store()

        def _publish() -> None:
            publish_workflow.run_due_schedules(store, settings)

        run_safe("publish_due", _publish)

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
