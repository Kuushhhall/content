"""SQLAlchemy ORM models for PostgreSQL."""

from datetime import datetime
from typing import Any

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    Integer,
    String,
    Text,
    JSON,
    Enum as SAEnum,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import ForeignKey

from app.database import Base


# ============================================================
# ENUMS
# ============================================================

import enum


class ArticleKind(str, enum.Enum):
    rss = "rss"
    tavily = "tavily"
    manual = "manual"


class ComplexityLevel(str, enum.Enum):
    beginner = "beginner"
    intermediate = "intermediate"
    expert = "expert"


class PrecedentValue(str, enum.Enum):
    high = "high"
    medium = "medium"
    low = "low"


class ScheduleStatus(str, enum.Enum):
    pending = "pending"
    running = "running"
    completed = "completed"
    failed = "failed"
    cancelled = "cancelled"


class CommentStatus(str, enum.Enum):
    new = "new"
    replied = "replied"
    ignored = "ignored"


class PipelineMode(str, enum.Enum):
    auto = "auto"
    manual = "manual"


class PipelineStatus(str, enum.Enum):
    idle = "idle"
    running = "running"
    completed = "completed"
    failed = "failed"


# ============================================================
# TABLES
# ============================================================


class ArticleDB(Base):
    __tablename__ = "articles"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    source: Mapped[str] = mapped_column(String(100), nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    url: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    summary_hint: Mapped[str] = mapped_column(Text, default="")
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    fetched_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    raw_excerpt: Mapped[str | None] = mapped_column(Text, nullable=True)
    kind: Mapped[ArticleKind] = mapped_column(
        SAEnum(ArticleKind), default=ArticleKind.rss
    )

    # Content intelligence
    full_content: Mapped[str] = mapped_column(Text, default="")
    structured_summary: Mapped[str] = mapped_column(Text, default="")
    extracted_facts: Mapped[list[str]] = mapped_column(JSON, default=list)

    # Legal metadata
    court_name: Mapped[str] = mapped_column(String(255), default="")
    case_number: Mapped[str] = mapped_column(String(100), default="")
    judges_involved: Mapped[list[str]] = mapped_column(JSON, default=list)
    parties: Mapped[list[str]] = mapped_column(JSON, default=list)
    jurisdiction: Mapped[str] = mapped_column(String(255), default="")
    precedent_value: Mapped[PrecedentValue] = mapped_column(
        SAEnum(PrecedentValue), default=PrecedentValue.medium
    )
    decision_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Content intelligence (denormalized)
    ci_topic: Mapped[str] = mapped_column(String(255), default="")
    ci_legal_area: Mapped[str] = mapped_column(String(255), default="")
    ci_audience: Mapped[list[str]] = mapped_column(JSON, default=list)
    ci_angle: Mapped[str] = mapped_column(Text, default="")
    ci_complexity_level: Mapped[ComplexityLevel] = mapped_column(
        SAEnum(ComplexityLevel), default=ComplexityLevel.intermediate
    )
    ci_virality_score: Mapped[float] = mapped_column(Float, default=0.0)
    ci_relevance_score: Mapped[float] = mapped_column(Float, default=0.0)
    ci_key_insights: Mapped[list[str]] = mapped_column(JSON, default=list)
    ci_affected_parties: Mapped[list[str]] = mapped_column(JSON, default=list)
    ci_legal_implications: Mapped[list[str]] = mapped_column(JSON, default=list)
    ci_suggested_hashtags: Mapped[list[str]] = mapped_column(JSON, default=list)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    drafts: Mapped[list["DraftDB"]] = relationship(back_populates="article", cascade="all, delete-orphan")
    summary: Mapped["ArticleSummaryDB | None"] = relationship(back_populates="article", uselist=False)
    comments: Mapped[list["EngagementCommentDB"]] = relationship(back_populates="article")


class ArticleSummaryDB(Base):
    __tablename__ = "article_summaries"

    article_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("articles.id", ondelete="CASCADE"), primary_key=True
    )
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    article: Mapped["ArticleDB"] = relationship(back_populates="summary")


class DraftDB(Base):
    __tablename__ = "drafts"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    article_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("articles.id", ondelete="CASCADE"), nullable=False
    )
    platform: Mapped[str] = mapped_column(String(50), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    article: Mapped["ArticleDB"] = relationship(back_populates="drafts")
    schedules: Mapped[list["ScheduleDB"]] = relationship(back_populates="draft", cascade="all, delete-orphan")
    publish_results: Mapped[list["PublishResultDB"]] = relationship(back_populates="draft")


class ScheduleDB(Base):
    __tablename__ = "schedules"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    draft_id: Mapped[str] = mapped_column(
        String(50), ForeignKey("drafts.id", ondelete="CASCADE"), nullable=False
    )
    platform: Mapped[str] = mapped_column(String(50), nullable=False)
    run_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[ScheduleStatus] = mapped_column(
        SAEnum(ScheduleStatus), default=ScheduleStatus.pending
    )
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    draft: Mapped["DraftDB"] = relationship(back_populates="schedules")


class PublishResultDB(Base):
    __tablename__ = "publish_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    job_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    draft_id: Mapped[str | None] = mapped_column(
        String(50), ForeignKey("drafts.id", ondelete="SET NULL"), nullable=True
    )
    platform: Mapped[str] = mapped_column(String(50), nullable=False)
    success: Mapped[bool] = mapped_column(Boolean, nullable=False)
    external_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    raw: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    draft: Mapped["DraftDB | None"] = relationship(back_populates="publish_results")


class EngagementCommentDB(Base):
    __tablename__ = "engagement_comments"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    article_id: Mapped[str | None] = mapped_column(
        String(32), ForeignKey("articles.id", ondelete="SET NULL"), nullable=True
    )
    platform: Mapped[str] = mapped_column(String(50), nullable=False)
    author: Mapped[str] = mapped_column(String(255), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    source_post_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[CommentStatus] = mapped_column(
        SAEnum(CommentStatus), default=CommentStatus.new
    )
    ai_suggested_reply: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    article: Mapped["ArticleDB | None"] = relationship(back_populates="comments")


class PipelineRunDB(Base):
    __tablename__ = "pipeline_runs"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    mode: Mapped[PipelineMode] = mapped_column(
        SAEnum(PipelineMode), default=PipelineMode.manual
    )
    status: Mapped[PipelineStatus] = mapped_column(
        SAEnum(PipelineStatus), default=PipelineStatus.idle
    )
    articles_ingested: Mapped[int] = mapped_column(Integer, default=0)
    drafts_generated: Mapped[int] = mapped_column(Integer, default=0)
    posts_published: Mapped[int] = mapped_column(Integer, default=0)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    steps: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class AppSettingDB(Base):
    __tablename__ = "app_settings"

    key: Mapped[str] = mapped_column(String(100), primary_key=True)
    value: Mapped[str] = mapped_column(Text, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )