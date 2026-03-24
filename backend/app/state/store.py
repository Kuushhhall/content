import uuid
from pathlib import Path

from app.models.article import NormalizedArticle
from app.models.draft import ContentDraft
from app.models.engagement import EngagementComment
from app.models.publish import PublishResult
from app.models.schedule import ScheduledPost
from app.state.models import RuntimeState
from app.state.persistence import load_state, save_state


class StateStore:
    def __init__(self, state_path: Path) -> None:
        self._path = state_path
        self._state = load_state(state_path)

    @property
    def runtime(self) -> RuntimeState:
        return self._state

    def _persist(self) -> None:
        save_state(self._path, self._state)

    def upsert_article(self, article: NormalizedArticle) -> NormalizedArticle:
        self._state.articles[article.id] = article
        self._persist()
        return article

    def list_articles(self) -> list[NormalizedArticle]:
        return sorted(self._state.articles.values(), key=lambda a: (a.published_at or a.fetched_at), reverse=True)

    def get_article(self, article_id: str) -> NormalizedArticle | None:
        return self._state.articles.get(article_id)

    def upsert_draft(self, draft: ContentDraft) -> ContentDraft:
        self._state.drafts[draft.id] = draft
        self._persist()
        return draft

    def list_drafts(self, article_id: str | None = None) -> list[ContentDraft]:
        drafts = list(self._state.drafts.values())
        if article_id:
            drafts = [d for d in drafts if d.article_id == article_id]
        return sorted(drafts, key=lambda d: d.updated_at, reverse=True)

    def get_draft(self, draft_id: str) -> ContentDraft | None:
        return self._state.drafts.get(draft_id)

    def upsert_schedule(self, post: ScheduledPost) -> ScheduledPost:
        self._state.schedules[post.id] = post
        self._persist()
        return post

    def list_schedules(self, status: str | None = None) -> list[ScheduledPost]:
        items = list(self._state.schedules.values())
        if status:
            items = [s for s in items if s.status == status]
        return sorted(items, key=lambda s: s.run_at)

    def get_schedule(self, schedule_id: str) -> ScheduledPost | None:
        return self._state.schedules.get(schedule_id)

    def set_article_summary(self, article_id: str, text: str) -> None:
        self._state.llm_article_summaries[article_id] = text
        self._persist()

    def get_article_summary(self, article_id: str) -> str | None:
        return self._state.llm_article_summaries.get(article_id)

    def append_publish_result(self, result: PublishResult) -> None:
        self._state.publish_results.append(result)
        self._persist()

    def recent_publish_results(self, limit: int = 50) -> list[PublishResult]:
        return self._state.publish_results[-limit:]

    def upsert_comment(self, comment: EngagementComment) -> EngagementComment:
        self._state.engagement_comments[comment.id] = comment
        self._persist()
        return comment

    def list_comments(self, platform: str | None = None) -> list[EngagementComment]:
        items = list(self._state.engagement_comments.values())
        if platform:
            items = [c for c in items if c.platform.lower() == platform.lower()]
        return sorted(items, key=lambda c: c.created_at, reverse=True)

    def get_comment(self, comment_id: str) -> EngagementComment | None:
        return self._state.engagement_comments.get(comment_id)

    def set_auto_reply_enabled(self, enabled: bool) -> None:
        self._state.auto_reply_enabled = enabled
        self._persist()

    def get_auto_reply_enabled(self) -> bool:
        return self._state.auto_reply_enabled

    @staticmethod
    def new_id(prefix: str = "") -> str:
        uid = str(uuid.uuid4())
        return f"{prefix}{uid}" if prefix else uid
