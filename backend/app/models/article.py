from datetime import UTC, datetime
from typing import Literal

from pydantic import BaseModel, Field


class NormalizedArticle(BaseModel):
    id: str
    source: str
    title: str
    url: str
    summary_hint: str = ""
    published_at: datetime | None = None
    fetched_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    raw_excerpt: str | None = None
    kind: Literal["rss", "tavily", "manual"] = "rss"
