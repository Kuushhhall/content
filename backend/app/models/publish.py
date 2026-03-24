from datetime import UTC, datetime
from typing import Any

from pydantic import BaseModel, Field


class PublishJob(BaseModel):
    id: str
    draft_id: str
    platform: str
    immediate: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class PublishResult(BaseModel):
    job_id: str | None = None
    platform: str
    success: bool
    external_id: str | None = None
    message: str | None = None
    raw: dict[str, Any] | None = None
    at: datetime = Field(default_factory=lambda: datetime.now(UTC))
