from fastapi import APIRouter

from app.api.deps import StoreDep

router = APIRouter(prefix="/costs", tags=["costs"])


@router.get("")
def list_cost_records(store: StoreDep, limit: int = 200) -> list[dict]:
    """Return recent API cost records (newest last)."""
    return [r.model_dump() for r in store.list_cost_records(limit=limit)]


@router.get("/summary")
def cost_summary(store: StoreDep) -> dict:
    """Return total cost summary broken down by API and model."""
    return store.get_cost_summary()
