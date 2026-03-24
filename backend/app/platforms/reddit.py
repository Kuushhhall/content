import logging

import praw

from app.core.config import Settings
from app.models.draft import ContentDraft
from app.models.publish import PublishResult

log = logging.getLogger(__name__)


def _parse_title_selftext(body: str) -> tuple[str, str]:
    lines = body.strip().splitlines()
    title = "Legal update"
    start = 0
    if lines and lines[0].strip():
        if lines[0].upper().startswith("TITLE:"):
            title = lines[0].split(":", 1)[1].strip() or title
            start = 1
        elif not lines[0].startswith("http"):
            # First line title heuristic when parser merged
            title = lines[0].strip()[:300]
            start = 1
    while start < len(lines) and not lines[start].strip():
        start += 1
    selftext = "\n".join(lines[start:]).strip()
    return title[:300], selftext


def publish(draft: ContentDraft, settings: Settings) -> PublishResult:
    if not all(
        [
            settings.reddit_client_id,
            settings.reddit_client_secret,
            settings.reddit_username,
            settings.reddit_password,
        ]
    ):
        return PublishResult(
            platform="reddit",
            success=False,
            message="Missing Reddit credentials (client_id, client_secret, username, password)",
        )

    title, selftext = _parse_title_selftext(draft.body)
    try:
        reddit = praw.Reddit(
            client_id=settings.reddit_client_id,
            client_secret=settings.reddit_client_secret,
            user_agent=settings.reddit_user_agent,
            username=settings.reddit_username,
            password=settings.reddit_password,
        )
        sub = reddit.subreddit(settings.reddit_subreddit)
        submission = sub.submit(title=title, selftext=selftext)
        return PublishResult(
            platform="reddit",
            success=True,
            external_id=submission.id,
            message=submission.url,
        )
    except Exception as e:
        log.exception("Reddit publish failed")
        return PublishResult(platform="reddit", success=False, message=str(e))
