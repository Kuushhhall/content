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
    FramerPipelineOut,
    PipelineModeIn,
    PipelineModeOut,
    PipelineRunOut,
    PipelineStatusOut,
)
from pydantic import BaseModel


class CancelPipelineRequest(BaseModel):
    run_id: str
from app.llm import pipeline as llm_pipeline
from app.llm.pipeline import generate_draft, generate_framer_draft
from app.platforms import framer as framer_pub
# from app.sources.rss import deduplicate_articles, score_articles_for_virality
from app.state.models import PipelineRunLog
from app.state.store import StateStore
from app.workflows import ingest as ingest_workflow
from app.workflows import publish as publish_workflow

log = logging.getLogger(__name__)


def score_articles_for_virality(articles):
    """Passthrough — virality scores are set during ingest enrichment."""
    return articles

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


# --- Cancel Pipeline ---
@router.post("/cancel")
def cancel_pipeline(body: CancelPipelineRequest, store: StoreDep) -> dict:
    """Cancel a running or pending pipeline."""
    success = store.cancel_pipeline_run(body.run_id)
    if success:
        return {"success": True, "message": f"Pipeline {body.run_id} marked for cancellation"}
    else:
        return {"success": False, "message": f"Pipeline {body.run_id} not found"}


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
async def batch_generate(body: BatchDraftIn, store: StoreDep, settings: SettingsDep) -> BatchDraftOut:
    """Generate drafts for one article across multiple platforms at once."""
    article = store.get_article(body.article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    drafts: list[DraftOut] = []
    errors: list[str] = []

    for platform in body.platforms:
        try:
            draft = await generate_draft(store, settings, article, platform, linkedin_target="profile")
            drafts.append(DraftOut.model_validate(draft.model_dump()))
        except Exception as e:
            log.exception("Batch generate failed for %s", platform)
            errors.append(f"{platform}: {e}")

    return BatchDraftOut(article_id=body.article_id, drafts=drafts, errors=errors)


# --- Run full pipeline ---
@router.post("/run", response_model=PipelineRunOut)
async def run_pipeline(store: StoreDep, settings: SettingsDep) -> PipelineRunOut:
    """One-click full pipeline: ingest → auto-select → generate → publish."""
    now = datetime.now(UTC)
    mode = store.get_pipeline_mode()
    run_id = StateStore.new_id("run_")

    run = PipelineRunLog(
        id=run_id,
        started_at=now.isoformat(),
        updated_at=now.isoformat(),
        mode=mode,
        status="running",
        steps=[],
    )
    store.append_pipeline_run(run)

    try:
        # Step 1: Ingest
        run.steps.append({"step": "ingest", "status": "running", "at": datetime.now(UTC).isoformat()})
        store.update_pipeline_run(run)
        n_ingested = await ingest_workflow.run_ingestion(store, settings)
        if store.is_pipeline_cancelled(run_id):
            run.status = "cancelled"
            run.finished_at = datetime.now(UTC).isoformat()
            run.updated_at = datetime.now(UTC).isoformat()
            store.update_pipeline_run(run)
            return _run_to_out(run)
        run.articles_ingested = n_ingested
        run.steps[-1]["status"] = "completed"
        run.steps[-1]["count"] = n_ingested
        run.updated_at = datetime.now(UTC).isoformat()

        # Step 2: Deduplicate + score
        run.steps.append({"step": "score", "status": "running", "at": datetime.now(UTC).isoformat()})
        store.update_pipeline_run(run)
        articles = store.list_articles()
        scored = score_articles_for_virality(list(articles))
        for a in scored:
            store.upsert_article(a)
        if store.is_pipeline_cancelled(run_id):
            run.status = "cancelled"
            run.finished_at = datetime.now(UTC).isoformat()
            run.updated_at = datetime.now(UTC).isoformat()
            store.update_pipeline_run(run)
            return _run_to_out(run)
        run.steps[-1]["status"] = "completed"
        run.updated_at = datetime.now(UTC).isoformat()

        # Step 3: Auto-select top articles
        run.steps.append({"step": "select", "status": "running", "at": datetime.now(UTC).isoformat()})
        store.update_pipeline_run(run)
        scored.sort(
            key=lambda a: (a.content_intelligence.virality_score, a.published_at or a.fetched_at),
            reverse=True,
        )
        top_articles = scored[:3]
        if store.is_pipeline_cancelled(run_id):
            run.status = "cancelled"
            run.finished_at = datetime.now(UTC).isoformat()
            run.updated_at = datetime.now(UTC).isoformat()
            store.update_pipeline_run(run)
            return _run_to_out(run)
        run.steps[-1]["status"] = "completed"
        run.steps[-1]["selected"] = [a.id for a in top_articles]
        run.updated_at = datetime.now(UTC).isoformat()

        # Step 4: Generate drafts (linkedin + x + framer for each)
        run.steps.append({"step": "generate", "status": "running", "at": datetime.now(UTC).isoformat()})
        store.update_pipeline_run(run)
        gen_platforms = ["linkedin", "x", "framer"]
        drafts_generated = 0
        generated_draft_ids: list[str] = []
        for article in top_articles:
            for platform in gen_platforms:
                try:
                    draft = await generate_draft(store, settings, article, platform, linkedin_target="profile")
                    generated_draft_ids.append(draft.id)
                    drafts_generated += 1
                except Exception as e:
                    log.warning("Generate failed %s/%s: %s", article.id[:8], platform, e)
        if store.is_pipeline_cancelled(run_id):
            run.status = "cancelled"
            run.finished_at = datetime.now(UTC).isoformat()
            run.updated_at = datetime.now(UTC).isoformat()
            run.drafts_generated = drafts_generated
            store.update_pipeline_run(run)
            return _run_to_out(run)
        run.drafts_generated = drafts_generated
        run.steps[-1]["status"] = "completed"
        run.steps[-1]["count"] = drafts_generated
        run.updated_at = datetime.now(UTC).isoformat()

        # Step 5: Publish
        # Framer drafts are ALWAYS saved to Framer CMS (as unpublished drafts) regardless of mode.
        # LinkedIn/X/Reddit are only published in auto mode.
        posts_published = 0
        run.steps.append({"step": "publish", "status": "running", "at": datetime.now(UTC).isoformat()})
        store.update_pipeline_run(run)
        for did in generated_draft_ids:
            if store.is_pipeline_cancelled(run_id):
                run.status = "cancelled"
                run.finished_at = datetime.now(UTC).isoformat()
                run.updated_at = datetime.now(UTC).isoformat()
                run.posts_published = posts_published
                store.update_pipeline_run(run)
                return _run_to_out(run)
            draft = store.get_draft(did)
            if draft is None:
                continue
            platform = draft.platform.lower().strip()
            # Always push framer drafts to Framer CMS
            if platform == "framer":
                try:
                    result = framer_pub.publish(draft, settings, as_draft=True)
                    if result.success:
                        posts_published += 1
                    else:
                        log.warning("Framer publish failed for draft %s: %s", did, result.message)
                except Exception as e:
                    log.warning("Framer publish exception for draft %s: %s", did, e)
            elif mode == "auto":
                # Other platforms only in auto mode
                try:
                    result = publish_workflow.publish_immediate(store, settings, did)
                    if result.success:
                        posts_published += 1
                except Exception as e:
                    log.warning("Publish failed for draft %s: %s", did, e)
        run.posts_published = posts_published
        run.steps[-1]["status"] = "completed"
        run.steps[-1]["count"] = posts_published
        run.updated_at = datetime.now(UTC).isoformat()

        run.status = "completed"
        run.finished_at = datetime.now(UTC).isoformat()
        run.updated_at = datetime.now(UTC).isoformat()

    except Exception as e:
        log.exception("Pipeline run failed")
        run.status = "failed"
        run.error = str(e)
        run.finished_at = datetime.now(UTC).isoformat()
        run.updated_at = datetime.now(UTC).isoformat()

    store.update_pipeline_run(run)
    return _run_to_out(run)


# --- Framer-only auto pipeline (saves as CMS draft, never publishes live) ---
@router.post("/run-framer", response_model=FramerPipelineOut)
async def run_framer_pipeline(store: StoreDep, settings: SettingsDep) -> FramerPipelineOut:
    """Framer auto pipeline: ingest → select best article → generate content → save as Framer draft.

    Always saves as a CMS draft (not live). User reviews and publishes from Framer editor.
    Does not affect or depend on pipeline mode.
    """
    run_id = StateStore.new_id("framer_run_")
    steps: list[dict] = []

    def _step(name: str, status: str, **extra) -> None:
        steps.append({"step": name, "status": status, "at": datetime.now(UTC).isoformat(), **extra})
        log.info("Framer pipeline step %r: %s", name, status)

    try:
        # Step 1: Tavily ingest
        _step("ingest", "running")
        candidates = await ingest_workflow.run_framer_ingestion(store, settings)
        store.append_cost_record(store.build_cost_record(
            pipeline_run_id=run_id,
            api="tavily",
            model="tavily-search",
            call_type="ingest",
            usage={"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
        ))
        if store.is_pipeline_cancelled(run_id):
            steps[-1]["status"] = "cancelled"
            return FramerPipelineOut(run_id=run_id, status="cancelled", steps=steps)
        steps[-1]["status"] = "completed"
        steps[-1]["count"] = len(candidates)

        if not candidates:
            return FramerPipelineOut(
                run_id=run_id, status="failed",
                steps=steps, error="No articles found after ingestion",
            )

        # Step 2: LLM selects best article by title+snippet (token-efficient)
        _step("select", "running")
        best, select_usage = llm_pipeline.select_best_article_by_title(candidates, settings)
        store.append_cost_record(store.build_cost_record(
            pipeline_run_id=run_id,
            api="openai",
            model=settings.llm_model or "unknown",
            call_type="select",
            usage=select_usage,
        ))
        if store.is_pipeline_cancelled(run_id):
            steps[-1]["status"] = "cancelled"
            return FramerPipelineOut(run_id=run_id, status="cancelled", steps=steps)
        steps[-1]["status"] = "completed"
        steps[-1]["selected"] = best.id
        steps[-1]["title"] = best.title
        log.info("Framer pipeline selected: %r (source=%s)", best.title, best.source)

        # Step 3: Generate Framer draft via LLM
        _step("generate", "running")
        draft, gen_usage = await generate_framer_draft(store, settings, best)
        store.append_cost_record(store.build_cost_record(
            pipeline_run_id=run_id,
            api="openai",
            model=settings.llm_model or "unknown",
            call_type="generate",
            usage=gen_usage,
        ))
        if store.is_pipeline_cancelled(run_id):
            steps[-1]["status"] = "cancelled"
            return FramerPipelineOut(run_id=run_id, status="cancelled", article_id=best.id, draft_id=draft.id, steps=steps)
        steps[-1]["status"] = "completed"
        steps[-1]["draft_id"] = draft.id

        # Step 4: Save to Framer CMS as draft (not live)
        _step("save_draft", "running")
        if store.is_pipeline_cancelled(run_id):
            steps[-1]["status"] = "cancelled"
            return FramerPipelineOut(run_id=run_id, status="cancelled", article_id=best.id, draft_id=draft.id, steps=steps)
        result = framer_pub.publish(draft, settings, as_draft=True)
        if result.success:
            steps[-1]["status"] = "completed"
            steps[-1]["framer_item_id"] = result.external_id
        else:
            steps[-1]["status"] = "failed"
            steps[-1]["error"] = result.message
            return FramerPipelineOut(
                run_id=run_id, status="failed",
                article_id=best.id, article_title=best.title, article_url=best.url,
                draft_id=draft.id, steps=steps,
                error=f"Framer save failed: {result.message}",
            )

        return FramerPipelineOut(
            run_id=run_id, status="completed",
            article_id=best.id,
            article_title=best.title,
            article_url=best.url,
            draft_id=draft.id,
            framer_item_id=result.external_id,
            steps=steps,
        )

    except Exception as e:
        log.exception("Framer pipeline failed")
        if steps and steps[-1]["status"] == "running":
            steps[-1]["status"] = "failed"
        return FramerPipelineOut(
            run_id=run_id, status="failed",
            steps=steps, error=str(e),
        )


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
