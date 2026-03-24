from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException

from app.api.deps import StoreDep
from app.api.schemas import AutoReplyToggleIn, EngagementCommentOut, EngagementReplyIn
from app.models.engagement import EngagementComment

router = APIRouter(prefix="/engagement", tags=["engagement"])


@router.get("/comments", response_model=list[EngagementCommentOut])
def list_comments(store: StoreDep, platform: str | None = None) -> list[EngagementCommentOut]:
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
    return [EngagementCommentOut.model_validate(c.model_dump()) for c in comments]


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
