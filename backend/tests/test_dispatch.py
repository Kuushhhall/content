from app.core.config import Settings
from app.models.draft import ContentDraft
from app.platforms.dispatch import publish_draft_to_platform


def test_unknown_platform():
    d = ContentDraft(
        id="d1",
        article_id="a1",
        platform="nosuch",
        body="x",
    )
    r = publish_draft_to_platform(d, Settings())
    assert r.success is False
    assert "Unknown platform" in (r.message or "")
