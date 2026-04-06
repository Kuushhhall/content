from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


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
    kind: str = "tavily"
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
    selected: bool = False
    image_url: str | None = None
    full_content_fetched: bool = False
    tags: list[str] = []


class DraftOut(BaseModel):
    id: str
    article_id: str
    platform: str
    body: str
    summary: str | None = None
    article_title: str | None = None
    article_description: str | None = None


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


class ArticleUpdateIn(BaseModel):
    title: str | None = None
    summary_hint: str | None = None
    full_content: str | None = None


class CycleRunOut(BaseModel):
    total_articles: int
    top_10_ids: list[str]
    drafts_created: int
    drafts: list[DraftOut] = []
    error: str | None = None
