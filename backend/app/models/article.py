from datetime import UTC, datetime
from typing import Literal, List, Optional

from pydantic import BaseModel, Field


class ContentIntelligence(BaseModel):
    """Structured content metadata for intelligent processing"""
    topic: str = ""
    legal_area: str = ""
    audience: List[str] = Field(default_factory=list)
    angle: str = ""
    complexity_level: Literal["beginner", "intermediate", "expert"] = "intermediate"
    virality_score: float = 0.0
    relevance_score: float = 0.0
    key_insights: List[str] = Field(default_factory=list)
    affected_parties: List[str] = Field(default_factory=list)
    legal_implications: List[str] = Field(default_factory=list)
    suggested_hashtags: List[str] = Field(default_factory=list)


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
    
    # Enhanced content intelligence
    content_intelligence: ContentIntelligence = Field(default_factory=ContentIntelligence)
    full_content: str = ""
    structured_summary: str = ""
    extracted_facts: List[str] = Field(default_factory=list)
    court_name: str = ""
    case_number: str = ""
    judges_involved: List[str] = Field(default_factory=list)
    parties: List[str] = Field(default_factory=list)
    decision_date: Optional[datetime] = None
    precedent_value: Literal["high", "medium", "low"] = "medium"
    jurisdiction: str = ""
