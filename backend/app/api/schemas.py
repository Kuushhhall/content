from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class ContentIntelligenceOut(BaseModel):
    topic: str = ""
    legal_area: str = ""
    audience: list[str] = []
    angle: str = ""
    complexity_level: str = "intermediate"
    virality_score: float = 0.0
    relevance_score: float = 0.0
    key_insights: list[str] = []
    affected_parties: list[str] = []
    legal_implications: list[str] = []
    suggested_hashtags: list[str] = []


class ArticleOut(BaseModel):
    id: str
    source: str
    title: str
    url: str
    summary_hint: str = ""
    published_at: datetime | None = None
    kind: str = "rss"
    content_intelligence: ContentIntelligenceOut = ContentIntelligenceOut()
    structured_summary: str = ""
    full_content: str = ""
    raw_excerpt: str | None = None
    extracted_facts: list[str] = []
    court_name: str = ""
    case_number: str = ""
    judges_involved: list[str] = []
    parties: list[str] = []
    jurisdiction: str = ""
    precedent_value: str = "medium"


class DraftGenerateIn(BaseModel):
    article_id: str
    platform: Literal["linkedin", "x", "reddit", "framer", "medium", "instagram"]
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


# --- Pipeline schemas ---

class PipelineModeIn(BaseModel):
    mode: Literal["auto", "manual"]


class PipelineModeOut(BaseModel):
    mode: str


class PipelineRunOut(BaseModel):
    id: str
    started_at: str
    finished_at: str
    mode: str
    status: str
    articles_ingested: int
    drafts_generated: int
    posts_published: int
    error: str | None = None
    steps: list[dict] = []


class PipelineStatusOut(BaseModel):
    mode: str
    current_run: PipelineRunOut | None = None
    recent_runs: list[PipelineRunOut] = []


class BatchDraftIn(BaseModel):
    article_id: str
    platforms: list[Literal["linkedin", "x", "reddit", "framer", "medium", "instagram"]]


class BatchDraftOut(BaseModel):
    article_id: str
    drafts: list[DraftOut] = []
    errors: list[str] = []


class AutoSelectOut(BaseModel):
    article_ids: list[str]
    articles: list[ArticleOut] = []


class ArticleUpdateIn(BaseModel):
    title: str | None = None
    summary_hint: str | None = None
    structured_summary: str | None = None
    full_content: str | None = None
    court_name: str | None = None
    case_number: str | None = None
    judges_involved: list[str] | None = None
    parties: list[str] | None = None
    jurisdiction: str | None = None
    precedent_value: Literal["high", "medium", "low"] | None = None
