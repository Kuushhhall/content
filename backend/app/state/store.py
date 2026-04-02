import uuid
from pathlib import Path

from app.models.article import NormalizedArticle
from app.models.draft import ContentDraft
from app.models.engagement import EngagementComment
from app.models.publish import PublishResult
from app.models.schedule import ScheduledPost
from app.state.models import CostRecord, PipelineRunLog, RuntimeState
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

    def delete_article(self, article_id: str) -> bool:
        """Delete an article and all its associated drafts from the store."""
        if article_id not in self._state.articles:
            return False
        del self._state.articles[article_id]
        # Cascade delete drafts for this article
        draft_ids = [did for did, d in self._state.drafts.items() if d.article_id == article_id]
        for did in draft_ids:
            del self._state.drafts[did]
        self._persist()
        return True

    def list_articles_older_than(self, days: int) -> list[NormalizedArticle]:
        """List articles older than specified days."""
        from datetime import datetime, timedelta, UTC
        
        cutoff_date = datetime.now(UTC) - timedelta(days=days)
        old_articles = []
        
        for article in self._state.articles.values():
            # Use fetched_at as fallback if published_at is None
            article_date = article.published_at or article.fetched_at
            if article_date < cutoff_date:
                old_articles.append(article)
        
        return old_articles

    def list_articles(self, limit: int = 100) -> list[NormalizedArticle]:
        from datetime import UTC, datetime

        def _sort_key(a: NormalizedArticle) -> datetime:
            dt = a.published_at or a.fetched_at
            if dt.tzinfo is None:
                return dt.replace(tzinfo=UTC)
            return dt.astimezone(UTC)

        sorted_articles = sorted(self._state.articles.values(), key=_sort_key, reverse=True)
        return sorted_articles[:limit]

    def get_article(self, article_id: str) -> NormalizedArticle | None:
        return self._state.articles.get(article_id)

    def upsert_draft(self, draft: ContentDraft) -> ContentDraft:
        self._state.drafts[draft.id] = draft
        self._persist()
        return draft

    def delete_draft(self, draft_id: str) -> bool:
        """Delete a draft by ID from the store."""
        if draft_id in self._state.drafts:
            del self._state.drafts[draft_id]
            self._persist()
            return True
        return False

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

    def delete_schedule(self, schedule_id: str) -> bool:
        """Delete a schedule by ID from the store."""
        if schedule_id in self._state.schedules:
            del self._state.schedules[schedule_id]
            self._persist()
            return True
        return False

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

    # --- Pipeline mode ---
    def set_pipeline_mode(self, mode: str) -> None:
        self._state.pipeline_mode = mode
        self._persist()

    def get_pipeline_mode(self) -> str:
        return self._state.pipeline_mode

    def append_pipeline_run(self, run: PipelineRunLog) -> None:
        self._state.pipeline_runs.append(run)
        self._persist()

    def update_pipeline_run(self, run: PipelineRunLog) -> None:
        for i, r in enumerate(self._state.pipeline_runs):
            if r.id == run.id:
                self._state.pipeline_runs[i] = run
                self._persist()
                return
        self._state.pipeline_runs.append(run)
        self._persist()

    def recent_pipeline_runs(self, limit: int = 10) -> list[PipelineRunLog]:
        return self._state.pipeline_runs[-limit:]

    def current_pipeline_run(self) -> PipelineRunLog | None:
        for r in reversed(self._state.pipeline_runs):
            if r.status == "running":
                return r
        return None

    def cancel_pipeline_run(self, run_id: str, reason: str = "User requested cancellation") -> bool:
        """Mark a pipeline run as cancelled. Returns True if found and cancelled."""
        from datetime import UTC, datetime

        for run in self._state.pipeline_runs:
            if run.id == run_id:
                run.cancelled = True
                run.cancellation_reason = reason
                run.status = "cancelled"
                run.finished_at = datetime.now(UTC).isoformat()
                run.updated_at = datetime.now(UTC).isoformat()
                self._persist()
                return True
        return False

    def is_pipeline_cancelled(self, run_id: str) -> bool:
        """Check if a specific pipeline run has been cancelled."""
        for run in self._state.pipeline_runs:
            if run.id == run_id:
                return run.cancelled
        return False

    # -------------------------------------------------------------------------
    # Cost tracking
    # -------------------------------------------------------------------------

    # USD per 1M tokens for known models
    _MODEL_COSTS_USD_PER_1M: dict = {
        "gpt-4o": {"input": 2.50, "output": 10.00},
        "gpt-4o-mini": {"input": 0.15, "output": 0.60},
        "gpt-5-nano": {"input": 0.15, "output": 0.60},
        "o3-mini": {"input": 1.10, "output": 4.40},
        "llama-3.3-70b-versatile": {"input": 0.59, "output": 0.79},
        "llama-3.1-8b-instant": {"input": 0.05, "output": 0.08},
        "default": {"input": 0.50, "output": 1.50},
    }
    _TAVILY_COST_USD_PER_SEARCH: float = 0.01
    _USD_TO_INR: float = 84.0

    def build_cost_record(
        self,
        pipeline_run_id: str,
        api: str,
        model: str,
        call_type: str,
        usage: dict,
    ) -> CostRecord:
        from datetime import UTC, datetime

        prompt_tokens = usage.get("prompt_tokens", 0) or 0
        completion_tokens = usage.get("completion_tokens", 0) or 0
        total_tokens = usage.get("total_tokens", 0) or 0

        if api == "tavily":
            cost_usd = self._TAVILY_COST_USD_PER_SEARCH
        else:
            rates = self._MODEL_COSTS_USD_PER_1M.get(model, self._MODEL_COSTS_USD_PER_1M["default"])
            cost_usd = (
                prompt_tokens * rates["input"] / 1_000_000
                + completion_tokens * rates["output"] / 1_000_000
            )

        return CostRecord(
            id=self.new_id("cost_"),
            at=datetime.now(UTC).isoformat(),
            pipeline_run_id=pipeline_run_id,
            api=api,
            model=model,
            call_type=call_type,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens,
            cost_usd=round(cost_usd, 8),
            cost_inr=round(cost_usd * self._USD_TO_INR, 6),
        )

    def append_cost_record(self, record: CostRecord) -> None:
        self._state.cost_records.append(record)
        self._persist()

    def list_cost_records(self, limit: int = 200) -> list[CostRecord]:
        return self._state.cost_records[-limit:]

    def get_cost_summary(self) -> dict:
        records = self._state.cost_records
        total_usd = sum(r.cost_usd for r in records)
        total_inr = sum(r.cost_inr for r in records)
        by_api: dict = {}
        by_model: dict = {}
        for r in records:
            by_api.setdefault(r.api, {"cost_usd": 0.0, "cost_inr": 0.0, "calls": 0})
            by_api[r.api]["cost_usd"] += r.cost_usd
            by_api[r.api]["cost_inr"] += r.cost_inr
            by_api[r.api]["calls"] += 1
            by_model.setdefault(r.model, {"cost_usd": 0.0, "cost_inr": 0.0, "calls": 0})
            by_model[r.model]["cost_usd"] += r.cost_usd
            by_model[r.model]["cost_inr"] += r.cost_inr
            by_model[r.model]["calls"] += 1
        return {
            "total_usd": round(total_usd, 6),
            "total_inr": round(total_inr, 4),
            "total_calls": len(records),
            "by_api": by_api,
            "by_model": by_model,
        }

    @staticmethod
    def new_id(prefix: str = "") -> str:
        uid = str(uuid.uuid4())
        return f"{prefix}{uid}" if prefix else uid
