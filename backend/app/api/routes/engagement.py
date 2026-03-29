from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, Query

from app.api.deps import StoreDep
from app.api.schemas import AutoReplyToggleIn, EngagementCommentOut, EngagementReplyIn
from app.models.engagement import EngagementComment

router = APIRouter(prefix="/engagement", tags=["engagement"])


@router.get("/comments", response_model=dict)
async def list_comments(
    store: StoreDep,
    platform: str | None = Query(None, description="Filter by platform"),
    status: str | None = Query(None, description="Filter by status"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
) -> dict:
    """List comments from in-memory store."""
    comments = store.list_comments()

    # Apply filters
    if platform:
        comments = [c for c in comments if c.platform == platform]
    if status:
        comments = [c for c in comments if c.status == status]

    # Sort by created_at (newest first)
    comments.sort(key=lambda x: x.created_at or datetime.min, reverse=True)

    # Simple pagination
    total = len(comments)
    start = (page - 1) * page_size
    end = start + page_size
    paginated_comments = comments[start:end]

    return {
        "items": [EngagementCommentOut.model_validate(c.model_dump()) for c in paginated_comments],
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": (total + page_size - 1) // page_size,
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
