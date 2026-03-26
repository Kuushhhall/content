from fastapi import APIRouter

from app.api.deps import StoreDep, DBSessionDep
from app.api.schemas import AnalyticsOverviewOut
from app.repositories.engagement import EngagementRepository

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/overview", response_model=AnalyticsOverviewOut)
async def overview(store: StoreDep, db: DBSessionDep) -> AnalyticsOverviewOut:
    """Get analytics overview. O(log n) via database aggregate indexes."""
    if db:
        repo = EngagementRepository(db)
        data = await repo.get_analytics_overview()
        return AnalyticsOverviewOut(
            total_posts=data["total_posts"],
            success_posts=data["success_posts"],
            failed_posts=data["failed_posts"],
            success_rate=round(data["success_rate"], 3),
            by_platform=data["by_platform"],
        )
    else:
        # Fallback to in-memory store
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
