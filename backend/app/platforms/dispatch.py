from app.core.config import Settings
from app.models.draft import ContentDraft
from app.models.publish import PublishResult
from app.platforms import framer as framer_pub
from app.platforms import linkedin as li_pub
from app.platforms import medium as medium_pub
from app.platforms import reddit as reddit_pub
from app.platforms import x_twitter as x_pub


def publish_draft_to_platform(draft: ContentDraft, settings: Settings) -> PublishResult:
    p = draft.platform.lower().strip()
    if p == "linkedin":
        return li_pub.publish(draft, settings)
    if p in ("x", "twitter", "x_twitter"):
        return x_pub.publish(draft, settings)
    if p == "reddit":
        return reddit_pub.publish(draft, settings)
    if p == "framer":
        return framer_pub.publish(draft, settings)
    if p == "medium":
        return medium_pub.publish(draft, settings)
    return PublishResult(
        platform=draft.platform,
        success=False,
        message=f"Unknown platform: {draft.platform}",
    )
