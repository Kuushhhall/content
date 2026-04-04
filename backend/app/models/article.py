from datetime import UTC, datetime
from typing import Literal

from pydantic import BaseModel, Field


class ContentIntelligence(BaseModel):
    topic: str = ""
    legal_area: str = ""
    audience: list[str] = Field(default_factory=list)
    angle: str = ""
    complexity_level: Literal["beginner", "intermediate", "expert"] = "intermediate"
    virality_score: float = 0.0
    relevance_score: float = 0.0
    key_insights: list[str] = Field(default_factory=list)
    affected_parties: list[str] = Field(default_factory=list)
    legal_implications: list[str] = Field(default_factory=list)
    suggested_hashtags: list[str] = Field(default_factory=list)


class NormalizedArticle(BaseModel):
    id: str
    source: str
    title: str
    url: str
    summary_hint: str = ""
    published_at: datetime | None = None
    fetched_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    raw_excerpt: str | None = None
    kind: Literal["tavily", "manual", "openai_search"] = "tavily"

    content_intelligence: ContentIntelligence = Field(default_factory=ContentIntelligence)
    full_content: str = ""
    structured_summary: str = ""
    extracted_facts: list[str] = Field(default_factory=list)
    court_name: str = ""
    case_number: str = ""
    judges_involved: list[str] = Field(default_factory=list)
    parties: list[str] = Field(default_factory=list)
    decision_date: datetime | None = None
    precedent_value: Literal["high", "medium", "low"] = "medium"
    jurisdiction: str = ""

    selected: bool = False
    image_url: str | None = None
    full_content_fetched: bool = False
    tags: list[str] = Field(default_factory=list)
