from fastapi import APIRouter, Query

from app.api.deps import StoreDep

router = APIRouter(prefix="/costs", tags=["costs"])


@router.get("", response_model=dict)
def list_costs(store: StoreDep, limit: int = Query(200, ge=1, le=1000)) -> dict:
    records = store.list_cost_records(limit=limit)
    return {
        "items": [r.model_dump(mode="json") for r in records],
        "total": len(records),
    }


@router.get("/summary", response_model=dict)
def cost_summary(store: StoreDep) -> dict:
    return store.get_cost_summary()
