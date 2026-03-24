from datetime import UTC, datetime

from pydantic import BaseModel, Field


class EngagementComment(BaseModel):
    id: str
    platform: str
    author: str
    text: str
    source_post_id: str | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    status: str = "new"  # new | replied | ignored
    ai_suggested_reply: str | None = None
