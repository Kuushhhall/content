from datetime import UTC, datetime, timedelta

from app.core.config import Settings
from app.models.draft import ContentDraft
from app.models.schedule import ScheduledPost
from app.state.store import StateStore
from app.workflows.publish import run_due_schedules


def test_run_due_marks_completed_without_credentials(tmp_path, settings):
    path = tmp_path / "st.json"
    store = StateStore(path)
    d = ContentDraft(id="d1", article_id="a1", platform="linkedin", body="hello")
    store.upsert_draft(d)
    past = datetime.now(UTC) - timedelta(minutes=5)
    s = ScheduledPost(id="s1", draft_id="d1", platform="linkedin", run_at=past, status="pending")
    store.upsert_schedule(s)
    n = run_due_schedules(store, settings)
    assert n == 1
    updated = store.get_schedule("s1")
    assert updated is not None
    assert updated.status in ("completed", "failed")
