import json
import uuid
from pathlib import Path
import logging

from app.models.article import NormalizedArticle
from app.models.cycle import CycleProgress
from app.models.draft import ContentDraft
from app.models.publish import PublishResult
from app.models.schedule import ScheduledPost
from app.state.models import CostRecord, RuntimeState
from app.state.persistence import atomic_write_json, load_state, save_state

log = logging.getLogger(__name__)


class StateStore:
    def __init__(self, state_path: Path) -> None:
        self._path = state_path
        self._costs_path = state_path.parent / "costs.json"
        self._state = load_state(state_path)
        self._load_costs()
        # Bootstrap costs.json from state.json if it doesn't exist yet
        if not self._costs_path.exists() and self._state.cost_records:
            self._persist_costs()

    def _load_costs(self) -> None:
        """Load cost records from dedicated costs.json (persists across state resets)."""
        if not self._costs_path.exists():
            return
        try:
            raw = json.loads(self._costs_path.read_text(encoding="utf-8"))
            loaded = [CostRecord.model_validate(r) for r in raw.get("records", [])]
            # Merge: add any from file not already in memory (by id)
            existing_ids = {r.id for r in self._state.cost_records}
            for r in loaded:
                if r.id not in existing_ids:
                    self._state.cost_records.append(r)
        except Exception:
            pass

    def _persist_costs(self) -> None:
        """Persist cost records to dedicated costs.json."""
        data = {"records": [r.model_dump(mode="json") for r in self._state.cost_records]}
        atomic_write_json(self._costs_path, data)

    @property
    def runtime(self) -> RuntimeState:
        return self._state

    def _persist(self) -> None:
        log.info("[STORE] Saving state to %s (articles: %d, drafts: %d)", 
                 self._path, len(self._state.articles), len(self._state.drafts))
        save_state(self._path, self._state)

    # -------------------------------------------------------------------------
    # Articles
    # -------------------------------------------------------------------------

    def upsert_article(self, article: NormalizedArticle) -> NormalizedArticle:
        self._state.articles[article.id] = article
        log.info("[STORE] Article upserted: %s - %s", article.id, article.title[:50])
        self._persist()
        return article

    def delete_article(self, article_id: str) -> bool:
        if article_id not in self._state.articles:
            return False
        del self._state.articles[article_id]
        draft_ids = [did for did, d in self._state.drafts.items() if d.article_id == article_id]
        for did in draft_ids:
            del self._state.drafts[did]
        self._persist()
        return True

    def list_articles_older_than(self, days: int) -> list[NormalizedArticle]:
        from datetime import datetime, timedelta, UTC
        cutoff_date = datetime.now(UTC) - timedelta(days=days)
        old_articles = []
        for article in self._state.articles.values():
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

    # -------------------------------------------------------------------------
    # Drafts
    # -------------------------------------------------------------------------

    def upsert_draft(self, draft: ContentDraft) -> ContentDraft:
        self._state.drafts[draft.id] = draft
        log.info("[STORE] Draft upserted: %s - %s (platform: %s)", draft.id, draft.body[:50] if draft.body else "empty", draft.platform)
        self._persist()
        return draft

    def delete_draft(self, draft_id: str) -> bool:
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

    # -------------------------------------------------------------------------
    # Schedules
    # -------------------------------------------------------------------------

    def upsert_schedule(self, post: ScheduledPost) -> ScheduledPost:
        self._state.schedules[post.id] = post
        self._persist()
        return post

    def delete_schedule(self, schedule_id: str) -> bool:
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

    def get_pending_schedules(self) -> list[ScheduledPost]:
        """Get schedules that are pending and past their run_at time."""
        from datetime import UTC, datetime
        now = datetime.now(UTC)
        return [
            s for s in self._state.schedules.values()
            if s.status == "pending" and s.run_at <= now
        ]

    # -------------------------------------------------------------------------
    # Publish results
    # -------------------------------------------------------------------------

    def append_publish_result(self, result: PublishResult) -> None:
        self._state.publish_results.append(result)
        self._persist()

    def recent_publish_results(self, limit: int = 50) -> list[PublishResult]:
        return self._state.publish_results[-limit:]

    # -------------------------------------------------------------------------
    # Cost tracking
    # -------------------------------------------------------------------------

    _MODEL_COSTS_USD_PER_1M: dict = {
        "gpt-4o": {"input": 2.50, "output": 10.00},
        "gpt-4o-mini": {"input": 0.15, "output": 0.60},
        "gpt-5-nano": {"input": 0.20, "output": 1.25},
        "gpt-5.4-nano": {"input": 0.20, "output": 1.25},
        "o3-mini": {"input": 1.10, "output": 4.40},
        "llama-3.3-70b-versatile": {"input": 0.59, "output": 0.79},
        "llama-3.1-8b-instant": {"input": 0.05, "output": 0.08},
        "default": {"input": 0.20, "output": 1.25},
    }
    _USD_TO_INR: float = 84.0

    def record_llm_cost(
        self,
        cycle_id: str,
        model: str,
        call_type: str,
        usage: dict,
    ) -> CostRecord:
        from datetime import UTC, datetime

        prompt_tokens = usage.get("prompt_tokens", 0) or 0
        completion_tokens = usage.get("completion_tokens", 0) or 0
        total_tokens = usage.get("total_tokens", 0) or 0

        rates = self._MODEL_COSTS_USD_PER_1M.get(model, self._MODEL_COSTS_USD_PER_1M["default"])
        cost_usd = (
            prompt_tokens * rates["input"] / 1_000_000
            + completion_tokens * rates["output"] / 1_000_000
        )

        record = CostRecord(
            id=self.new_id("cost_"),
            at=datetime.now(UTC).isoformat(),
            pipeline_run_id=cycle_id,
            api="openai",
            model=model,
            call_type=call_type,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens,
            cost_usd=round(cost_usd, 8),
            cost_inr=round(cost_usd * self._USD_TO_INR, 6),
        )
        self._state.cost_records.append(record)
        self._persist_costs()
        self._persist()
        return record

    def list_cost_records(self, limit: int = 200) -> list[CostRecord]:
        return self._state.cost_records[-limit:]

    def get_cycle_cost(self, cycle_id: str) -> dict:
        """Return total cost for a specific pipeline cycle_id."""
        records = [r for r in self._state.cost_records if r.pipeline_run_id == cycle_id]
        total_usd = sum(r.cost_usd for r in records)
        total_inr = sum(r.cost_inr for r in records)
        total_tokens = sum(r.total_tokens for r in records)
        return {
            "cycle_id": cycle_id,
            "total_usd": round(total_usd, 8),
            "total_inr": round(total_inr, 6),
            "total_tokens": total_tokens,
            "calls": len(records),
            "breakdown": [r.model_dump(mode="json") for r in records],
        }

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

    # -------------------------------------------------------------------------
    # Cycle progress (persistent)
    # -------------------------------------------------------------------------

    def get_cycle_progress(self) -> CycleProgress:
        return self._state.cycle_progress

    def set_cycle_progress(self, progress: CycleProgress) -> None:
        self._state.cycle_progress = progress
        self._persist()

    def reset_cycle_progress(self) -> None:
        self._state.cycle_progress = CycleProgress()
        self._persist()

    # -------------------------------------------------------------------------
    # Utilities
    # -------------------------------------------------------------------------

    @staticmethod
    def new_id(prefix: str = "") -> str:
        uid = str(uuid.uuid4())
        return f"{prefix}{uid}" if prefix else uid
