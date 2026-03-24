from typing import Any

from pydantic import BaseModel, Field

from app.models.article import NormalizedArticle
from app.models.draft import ContentDraft
from app.models.engagement import EngagementComment
from app.models.publish import PublishResult
from app.models.schedule import ScheduledPost


class AppStateSnapshot(BaseModel):
    articles: list[dict[str, Any]] = Field(default_factory=list)
    drafts: list[dict[str, Any]] = Field(default_factory=list)
    schedules: list[dict[str, Any]] = Field(default_factory=list)
    publish_results: list[dict[str, Any]] = Field(default_factory=list)
    llm_article_summaries: dict[str, str] = Field(default_factory=dict)
    engagement_comments: list[dict[str, Any]] = Field(default_factory=list)
    auto_reply_enabled: bool = False


class RuntimeState:
    def __init__(self) -> None:
        self.articles: dict[str, NormalizedArticle] = {}
        self.drafts: dict[str, ContentDraft] = {}
        self.schedules: dict[str, ScheduledPost] = {}
        self.publish_results: list[PublishResult] = []
        self.llm_article_summaries: dict[str, str] = {}
        self.engagement_comments: dict[str, EngagementComment] = {}
        self.auto_reply_enabled: bool = False

    def to_snapshot(self) -> AppStateSnapshot:
        return AppStateSnapshot(
            articles=[a.model_dump(mode="json") for a in self.articles.values()],
            drafts=[d.model_dump(mode="json") for d in self.drafts.values()],
            schedules=[s.model_dump(mode="json") for s in self.schedules.values()],
            publish_results=[r.model_dump(mode="json") for r in self.publish_results[-500:]],
            llm_article_summaries=dict(self.llm_article_summaries),
            engagement_comments=[c.model_dump(mode="json") for c in self.engagement_comments.values()],
            auto_reply_enabled=self.auto_reply_enabled,
        )

    @classmethod
    def from_snapshot(cls, snap: AppStateSnapshot) -> "RuntimeState":
        rs = cls()
        for item in snap.articles:
            a = NormalizedArticle.model_validate(item)
            rs.articles[a.id] = a
        for item in snap.drafts:
            d = ContentDraft.model_validate(item)
            rs.drafts[d.id] = d
        for item in snap.schedules:
            s = ScheduledPost.model_validate(item)
            rs.schedules[s.id] = s
        for item in snap.publish_results:
            rs.publish_results.append(PublishResult.model_validate(item))
        rs.llm_article_summaries = dict(snap.llm_article_summaries)
        for item in snap.engagement_comments:
            c = EngagementComment.model_validate(item)
            rs.engagement_comments[c.id] = c
        rs.auto_reply_enabled = snap.auto_reply_enabled
        return rs
