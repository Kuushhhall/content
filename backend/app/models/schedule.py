from datetime import UTC, datetime

from pydantic import BaseModel, Field


class ScheduledPost(BaseModel):
    id: str
    draft_id: str
    platform: str
    run_at: datetime
    status: str = "pending"  # pending | running | completed | failed | cancelled
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    error: str | None = None
