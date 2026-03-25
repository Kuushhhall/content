import logging
from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException

from app.api.deps import SettingsDep, StoreDep
from app.api.schemas import (
    ArticleOut,
    AutoSelectOut,
    BatchDraftIn,
    BatchDraftOut,
    DraftOut,
    PipelineModeIn,
    PipelineModeOut,
    PipelineRunOut,
    PipelineStatusOut,
)
from app.llm.pipeline import generate_draft
from app.sources.rss import deduplicate_articles, score_articles_for_virality
from app.state.models import PipelineRunLog
from app.state.store import StateStore
from app.workflows import ingest as ingest_workflow
from app.workflows import publish as publish_workflow

log = logging.getLogger(__name__)

router = APIRouter(prefix="/pipeline", tags=["pipeline"])


def _run_to_out(r: PipelineRunLog) -> PipelineRunOut:
    return PipelineRunOut(
        id=r.id,
        started_at=r.started_at,
        finished_at=r.finished_at,
        mode=r.mode,
        status=r.status,
        articles_ingested=r.articles_ingested,
        drafts_generated=r.drafts_generated,
        posts_published=r.posts_published,
        error=r.error,
        steps=r.steps,
    )


# --- Mode ---
@router.get("/mode", response_model=PipelineModeOut)
def get_mode(store: StoreDep) -> PipelineModeOut:
    return PipelineModeOut(mode=store.get_pipeline_mode())


@router.post("/mode", response_model=PipelineModeOut)
def set_mode(body: PipelineModeIn, store: StoreDep) -> PipelineModeOut:
    store.set_pipeline_mode(body.mode)
    return PipelineModeOut(mode=store.get_pipeline_mode())


# --- Status ---
@router.get("/status", response_model=PipelineStatusOut)
def pipeline_status(store: StoreDep) -> PipelineStatusOut:
    current = store.current_pipeline_run()
    recent = store.recent_pipeline_runs(limit=10)
    return PipelineStatusOut(
        mode=store.get_pipeline_mode(),
        current_run=_run_to_out(current) if current else None,
        recent_runs=[_run_to_out(r) for r in recent],
    )


# --- Auto-select top articles ---
@router.post("/auto-select", response_model=AutoSelectOut)
def auto_select_articles(store: StoreDep, count: int = 3) -> AutoSelectOut:
    """Select top articles by virality score / recency for auto mode."""
    articles = store.list_articles()
    if not articles:
        return AutoSelectOut(article_ids=[], articles=[])

    # Score and sort
    scored = score_articles_for_virality(list(articles))
    scored.sort(
        key=lambda a: (a.content_intelligence.virality_score, a.published_at or a.fetched_at),
        reverse=True,
    )
    top = scored[:count]
    return AutoSelectOut(
        article_ids=[a.id for a in top],
        articles=[ArticleOut.model_validate(a.model_dump()) for a in top],
    )


# --- Batch draft generation ---
@router.post("/batch-generate", response_model=BatchDraftOut)
def batch_generate(body: BatchDraftIn, store: StoreDep, settings: SettingsDep) -> BatchDraftOut:
    """Generate drafts for one article across multiple platforms at once."""
    article = store.get_article(body.article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    drafts: list[DraftOut] = []
    errors: list[str] = []

    for platform in body.platforms:
        try:
            draft = generate_draft(store, settings, article, platform)
            drafts.append(DraftOut.model_validate(draft.model_dump()))
        except Exception as e:
            log.exception("Batch generate failed for %s", platform)
            errors.append(f"{platform}: {e}")

    return BatchDraftOut(article_id=body.article_id, drafts=drafts, errors=errors)


# --- Run full pipeline ---
@router.post("/run", response_model=PipelineRunOut)
def run_pipeline(store: StoreDep, settings: SettingsDep) -> PipelineRunOut:
    """One-click full pipeline: ingest → auto-select → generate → publish."""
    now = datetime.now(UTC)
    mode = store.get_pipeline_mode()
    run_id = StateStore.new_id("run_")

    run = PipelineRunLog(
        id=run_id,
        started_at=now.isoformat(),
        mode=mode,
        status="running",
        steps=[],
    )
    store.append_pipeline_run(run)

    try:
        # Step 1: Ingest
        run.steps.append({"step": "ingest", "status": "running", "at": datetime.now(UTC).isoformat()})
        store.update_pipeline_run(run)
        n_ingested = ingest_workflow.run_ingestion(store, settings)
        run.articles_ingested = n_ingested
        run.steps[-1]["status"] = "completed"
        run.steps[-1]["count"] = n_ingested

        # Step 2: Deduplicate + score
        run.steps.append({"step": "score", "status": "running", "at": datetime.now(UTC).isoformat()})
        store.update_pipeline_run(run)
        articles = store.list_articles()
        scored = score_articles_for_virality(list(articles))
        for a in scored:
            store.upsert_article(a)
        run.steps[-1]["status"] = "completed"

        # Step 3: Auto-select top articles
        run.steps.append({"step": "select", "status": "running", "at": datetime.now(UTC).isoformat()})
        store.update_pipeline_run(run)
        scored.sort(
            key=lambda a: (a.content_intelligence.virality_score, a.published_at or a.fetched_at),
            reverse=True,
        )
        top_articles = scored[:3]
        run.steps[-1]["status"] = "completed"
        run.steps[-1]["selected"] = [a.id for a in top_articles]

        # Step 4: Generate drafts (linkedin + x + framer for each)
        run.steps.append({"step": "generate", "status": "running", "at": datetime.now(UTC).isoformat()})
        store.update_pipeline_run(run)
        gen_platforms = ["linkedin", "x", "framer"]
        drafts_generated = 0
        generated_draft_ids: list[str] = []
        for article in top_articles:
            for platform in gen_platforms:
                try:
                    draft = generate_draft(store, settings, article, platform)
                    generated_draft_ids.append(draft.id)
                    drafts_generated += 1
                except Exception as e:
                    log.warning("Generate failed %s/%s: %s", article.id[:8], platform, e)
        run.drafts_generated = drafts_generated
        run.steps[-1]["status"] = "completed"
        run.steps[-1]["count"] = drafts_generated

        # Step 5: Publish (auto mode only)
        posts_published = 0
        if mode == "auto" and generated_draft_ids:
            run.steps.append({"step": "publish", "status": "running", "at": datetime.now(UTC).isoformat()})
            store.update_pipeline_run(run)
            for did in generated_draft_ids:
                try:
                    result = publish_workflow.publish_immediate(store, settings, did)
                    if result.success:
                        posts_published += 1
                except Exception as e:
                    log.warning("Publish failed for draft %s: %s", did, e)
            run.posts_published = posts_published
            run.steps[-1]["status"] = "completed"
            run.steps[-1]["count"] = posts_published
        elif mode == "manual":
            run.steps.append({"step": "publish", "status": "skipped", "reason": "manual mode"})

        run.status = "completed"
        run.finished_at = datetime.now(UTC).isoformat()

    except Exception as e:
        log.exception("Pipeline run failed")
        run.status = "failed"
        run.error = str(e)
        run.finished_at = datetime.now(UTC).isoformat()

    store.update_pipeline_run(run)
    return _run_to_out(run)


# --- Engagement trigger ---
@router.post("/run-engagement", response_model=dict)
def run_engagement(store: StoreDep) -> dict:
    """Trigger engagement scan — filters high-intent comments for reply."""
    comments = store.list_comments()
    high_intent_keywords = [
        "how", "what", "why", "when", "can", "will", "should",
        "explain", "clarify", "help", "question", "?",
    ]

    high_intent = []
    for c in comments:
        if c.status != "new":
            continue
        text_lower = c.text.lower()
        if any(kw in text_lower for kw in high_intent_keywords):
            high_intent.append(c)

    return {
        "total_comments": len(comments),
        "new_comments": len([c for c in comments if c.status == "new"]),
        "high_intent": len(high_intent),
        "high_intent_ids": [c.id for c in high_intent],
    }
