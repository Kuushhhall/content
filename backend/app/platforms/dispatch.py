from app.core.config import Settings
from app.models.draft import ContentDraft
from app.models.publish import PublishResult
from app.platforms import framer as framer_pub


def publish_draft_to_platform(draft: ContentDraft, settings: Settings) -> PublishResult:
    p = draft.platform.lower().strip()
    if p == "framer":
        return framer_pub.publish(draft, settings, as_draft=False)
    return PublishResult(
        platform=draft.platform,
        success=False,
        message=f"Platform {p} is copy-paste only. Use the frontend copy button.",
    )
