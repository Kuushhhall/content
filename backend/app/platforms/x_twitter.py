import logging

import tweepy

from app.core.config import Settings
from app.models.draft import ContentDraft
from app.models.publish import PublishResult

log = logging.getLogger(__name__)


def _split_thread(body: str) -> list[str]:
    parts = [p.strip() for p in body.split("---")]
    return [p for p in parts if p][:15]


def publish(draft: ContentDraft, settings: Settings) -> PublishResult:
    missing = [
        n
        for n, v in [
            ("TWITTER_API_KEY", settings.twitter_api_key),
            ("TWITTER_API_SECRET", settings.twitter_api_secret),
            ("TWITTER_ACCESS_TOKEN", settings.twitter_access_token),
            ("TWITTER_ACCESS_TOKEN_SECRET", settings.twitter_access_token_secret),
        ]
        if not v
    ]
    if missing:
        return PublishResult(
            platform="x",
            success=False,
            message=f"Missing credentials: {', '.join(missing)}",
        )

    tweets = _split_thread(draft.body)
    if not tweets:
        return PublishResult(platform="x", success=False, message="Empty thread")

    try:
        client = tweepy.Client(
            consumer_key=settings.twitter_api_key,
            consumer_secret=settings.twitter_api_secret,
            access_token=settings.twitter_access_token,
            access_token_secret=settings.twitter_access_token_secret,
        )
        last_id = None
        for i, text in enumerate(tweets):
            kwargs = {"text": text[:280]}
            if last_id is not None:
                kwargs["in_reply_to_tweet_id"] = last_id
            resp = client.create_tweet(**kwargs)
            data = getattr(resp, "data", None)
            if not data:
                return PublishResult(
                    platform="x",
                    success=False,
                    message="No data in create_tweet response",
                )
            last_id = data["id"] if isinstance(data, dict) else getattr(data, "id", None)
            if not last_id:
                return PublishResult(
                    platform="x",
                    success=False,
                    message="Could not read tweet id from response",
                )
        return PublishResult(
            platform="x",
            success=True,
            external_id=str(last_id),
            raw={"tweets_posted": len(tweets)},
        )
    except Exception as e:
        log.exception("X publish failed")
        return PublishResult(platform="x", success=False, message=str(e))
