from datetime import UTC, datetime

from pydantic import BaseModel, Field


class CycleProgress(BaseModel):
    """Tracks the state of a content cycle run."""
    cycle_id: str = ""
    status: str = "idle"  # idle, running, completed, failed
    started_at: str = ""
    finished_at: str = ""
    step: str = ""
    step_detail: str = ""
    total_articles: int = 0
    articles_fetched: int = 0
    top_10_ids: list[str] = Field(default_factory=list)
    drafts_created: int = 0
    errors: list[str] = Field(default_factory=list)
    cycle_cost_usd: float = 0.0
    cycle_cost_inr: float = 0.0

    def to_dict(self) -> dict:
        return self.model_dump(mode="json")

    @classmethod
    def from_dict(cls, d: dict) -> "CycleProgress":
        return cls.model_validate(d)
