from fastapi import APIRouter

from app.api.deps import StoreDep
from app.api.schemas import AnalyticsOverviewOut

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/overview", response_model=AnalyticsOverviewOut)
def overview(store: StoreDep) -> AnalyticsOverviewOut:
    rows = store.recent_publish_results(limit=1000)
    total = len(rows)
    success = len([r for r in rows if r.success])
    failed = total - success
    by_platform: dict[str, int] = {}
    for row in rows:
        by_platform[row.platform] = by_platform.get(row.platform, 0) + 1
    success_rate = float(success / total) if total else 0.0
    return AnalyticsOverviewOut(
        total_posts=total,
        success_posts=success,
        failed_posts=failed,
        success_rate=round(success_rate, 3),
        by_platform=by_platform,
    )
