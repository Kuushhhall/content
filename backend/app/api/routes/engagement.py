from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, Query

from app.api.deps import StoreDep, DBSessionDep
from app.api.schemas import AutoReplyToggleIn, EngagementCommentOut, EngagementReplyIn
from app.models.engagement import EngagementComment
from app.repositories.engagement import EngagementRepository
from app.models.db_models import EngagementCommentDB

router = APIRouter(prefix="/engagement", tags=["engagement"])


@router.get("/comments", response_model=dict)
async def list_comments(
    store: StoreDep,
    db: DBSessionDep,
    platform: str | None = Query(None, description="Filter by platform"),
    status: str | None = Query(None, description="Filter by status"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
) -> dict:
    """List comments with pagination and filtering. O(log n) via database indexes."""
    if db:
        repo = EngagementRepository(db)
        offset = (page - 1) * page_size
        comments, total = await repo.list_comments(
            platform=platform,
            status=status,
            limit=page_size,
            offset=offset,
        )
        return {
            "items": [EngagementCommentOut.model_validate(c.__dict__) for c in comments],
            "total": total,
            "page": page,
            "page_size": page_size,
            "pages": (total + page_size - 1) // page_size,
        }
    else:
        # Fallback to in-memory store
        comments = store.list_comments(platform=platform)
        if not comments:
            seeded = EngagementComment(
                id=store.new_id("c_"),
                platform=platform or "linkedin",
                author="barandbench_reader",
                text="Interesting take. Can you share practical implications for trial courts?",
                created_at=datetime.now(UTC),
                ai_suggested_reply="Great point. Practical impact is mainly around filing strategy and interim relief thresholds.",
            )
            store.upsert_comment(seeded)
            comments = store.list_comments(platform=platform)
        return {
            "items": [EngagementCommentOut.model_validate(c.model_dump()) for c in comments],
            "total": len(comments),
            "page": 1,
            "page_size": len(comments),
            "pages": 1,
        }


@router.post("/reply", response_model=EngagementCommentOut)
def reply_comment(body: EngagementReplyIn, store: StoreDep) -> EngagementCommentOut:
    comment = store.get_comment(body.comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    comment.status = "replied"
    if body.reply_text:
        comment.ai_suggested_reply = body.reply_text
    store.upsert_comment(comment)
    return EngagementCommentOut.model_validate(comment.model_dump())


@router.post("/auto-reply", response_model=dict)
def toggle_auto_reply(body: AutoReplyToggleIn, store: StoreDep) -> dict:
    store.set_auto_reply_enabled(body.enabled)
    return {"enabled": store.get_auto_reply_enabled()}
