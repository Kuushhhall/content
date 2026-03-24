from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class ArticleOut(BaseModel):
    id: str
    source: str
    title: str
    url: str
    summary_hint: str = ""
    published_at: datetime | None = None
    kind: str = "rss"


class DraftGenerateIn(BaseModel):
    article_id: str
    platform: Literal["linkedin", "x", "reddit", "framer", "medium"]
    draft_id: str | None = None


class DraftOut(BaseModel):
    id: str
    article_id: str
    platform: str
    body: str
    summary: str | None = None


class DraftUpdateIn(BaseModel):
    body: str | None = None


class ScheduleIn(BaseModel):
    draft_id: str
    platform: str
    run_at: datetime


class ScheduleOut(BaseModel):
    id: str
    draft_id: str
    platform: str
    run_at: datetime
    status: str
    error: str | None = None


class PublishNowIn(BaseModel):
    draft_id: str


class PublishResultOut(BaseModel):
    platform: str
    success: bool
    external_id: str | None = None
    message: str | None = None
    at: datetime


class EngagementCommentOut(BaseModel):
    id: str
    platform: str
    author: str
    text: str
    source_post_id: str | None = None
    created_at: datetime
    status: str
    ai_suggested_reply: str | None = None


class EngagementReplyIn(BaseModel):
    comment_id: str
    reply_text: str | None = None


class AutoReplyToggleIn(BaseModel):
    enabled: bool


class AnalyticsOverviewOut(BaseModel):
    total_posts: int
    success_posts: int
    failed_posts: int
    success_rate: float
    by_platform: dict[str, int]
