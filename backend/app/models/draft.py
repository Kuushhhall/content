from datetime import UTC, datetime

from pydantic import BaseModel, Field


class ContentDraft(BaseModel):
    id: str
    article_id: str
    platform: str
    body: str
    summary: str | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
