from typing import Any

from pydantic import BaseModel, Field

from app.models.article import NormalizedArticle
from app.models.cycle import CycleProgress
from app.models.draft import ContentDraft
from app.models.publish import PublishResult
from app.models.schedule import ScheduledPost


class CostRecord(BaseModel):
    id: str = ""
    at: str = ""
    pipeline_run_id: str = ""
    api: str = ""
    model: str = ""
    call_type: str = ""
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    cost_usd: float = 0.0
    cost_inr: float = 0.0


class RuntimeState:
    def __init__(self) -> None:
        self.articles: dict[str, NormalizedArticle] = {}
        self.drafts: dict[str, ContentDraft] = {}
        self.schedules: dict[str, ScheduledPost] = {}
        self.publish_results: list[PublishResult] = []
        self.cost_records: list[CostRecord] = []
        self.cycle_progress = CycleProgress()

    def to_snapshot(self) -> dict[str, Any]:
        return {
            "articles": [a.model_dump(mode="json") for a in self.articles.values()],
            "drafts": [d.model_dump(mode="json") for d in self.drafts.values()],
            "schedules": [s.model_dump(mode="json") for s in self.schedules.values()],
            "publish_results": [r.model_dump(mode="json") for r in self.publish_results[-500:]],
            "cost_records": [r.model_dump(mode="json") for r in self.cost_records[-500:]],
            "cycle_progress": self.cycle_progress.to_dict(),
        }

    @classmethod
    def from_snapshot(cls, snap: dict[str, Any]) -> "RuntimeState":
        rs = cls()
        for item in snap.get("articles", []):
            a = NormalizedArticle.model_validate(item)
            rs.articles[a.id] = a
        for item in snap.get("drafts", []):
            d = ContentDraft.model_validate(item)
            rs.drafts[d.id] = d
        for item in snap.get("schedules", []):
            s = ScheduledPost.model_validate(item)
            rs.schedules[s.id] = s
        for item in snap.get("publish_results", []):
            rs.publish_results.append(PublishResult.model_validate(item))
        for item in snap.get("cost_records", []):
            rs.cost_records.append(CostRecord.model_validate(item))
        cp_data = snap.get("cycle_progress", {})
        if cp_data:
            rs.cycle_progress = CycleProgress.from_dict(cp_data)
        return rs
