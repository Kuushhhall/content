import logging
from datetime import datetime, timezone

from app.core.config import Settings
from app.models.engagement import EngagementComment
from app.models.publish import PublishResult
from app.models.schedule import ScheduledPost
from app.platforms.dispatch import publish_draft_to_platform
from app.state.store import StateStore

log = logging.getLogger(__name__)


def _to_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def run_due_schedules(store: StateStore, settings: Settings) -> int:
    """Execute schedules where run_at <= now and status is pending."""
    now = datetime.now(timezone.utc)
    due_fixed: list[ScheduledPost] = []
    for s in store.list_schedules():
        if s.status != "pending":
            continue
        if _to_utc(s.run_at) <= now:
            due_fixed.append(s)

    executed = 0
    for sched in due_fixed:
        draft = store.get_draft(sched.draft_id)
        if not draft:
            sched.status = "failed"
            sched.error = "Draft not found"
            store.upsert_schedule(sched)
            continue
        sched.status = "running"
        store.upsert_schedule(sched)
        try:
            result = publish_draft_to_platform(draft, settings)
            store.append_publish_result(result)
            if result.success:
                store.upsert_comment(
                    EngagementComment(
                        id=store.new_id("c_"),
                        platform=sched.platform,
                        author=f"{sched.platform}_follower",
                        text="Thanks for posting this update. Any practical takeaway?",
                        source_post_id=result.external_id,
                        ai_suggested_reply="The practical takeaway is to align filings and arguments with this latest interpretation.",
                    )
                )
            sched.status = "completed" if result.success else "failed"
            sched.error = None if result.success else (result.message or "Publish failed")
        except Exception as e:
            log.exception("Schedule publish failed")
            sched.status = "failed"
            sched.error = str(e)
            store.append_publish_result(
                PublishResult(platform=sched.platform, success=False, message=str(e))
            )
        store.upsert_schedule(sched)
        executed += 1
    if executed:
        log.info("Executed %s due scheduled posts", executed)
    return executed


def publish_immediate(store: StateStore, settings: Settings, draft_id: str) -> PublishResult:
    draft = store.get_draft(draft_id)
    if not draft:
        return PublishResult(platform="unknown", success=False, message="Draft not found")
    result = publish_draft_to_platform(draft, settings)
    store.append_publish_result(result)
    if result.success:
        store.upsert_comment(
            EngagementComment(
                id=store.new_id("c_"),
                platform=draft.platform,
                author=f"{draft.platform}_reader",
                text="Could you share one actionable point for practitioners?",
                source_post_id=result.external_id,
                ai_suggested_reply="One actionable point is to revisit your template pleadings based on this development.",
            )
        )
    return result
