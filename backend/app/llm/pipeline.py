import json
import logging
import re
from typing import Literal, Union

from openai import OpenAI

from app.core.config import Settings
from app.llm.prompts import (
    framer as framer_prompts,
    linkedin as li_prompts,
    medium as medium_prompts,
    reddit as reddit_prompts,
    instagram as insta_prompts,
    system,
    x_twitter as x_prompts,
)
from app.llm.prompts.base import build_summarize_prompt
from app.models.article import NormalizedArticle
from app.models.draft import ContentDraft
from app.state.store import StateStore

log = logging.getLogger(__name__)

Platform = Literal["linkedin", "x", "reddit", "framer", "medium", "instagram"]


def _client(settings: Settings) -> OpenAI:
    kwargs = {}
    if settings.openai_api_key:
        kwargs["api_key"] = settings.openai_api_key
    if settings.openai_base_url:
        kwargs["base_url"] = settings.openai_base_url
    return OpenAI(**kwargs)


def _complete(settings: Settings, system_msg: str, user: str) -> str:
    if not settings.openai_api_key:
        log.warning("No OPENAI_API_KEY — returning stub LLM output")
        return user[:500] + "\n\n[stub: set OPENAI_API_KEY for real output]"
    client = _client(settings)
    resp = client.chat.completions.create(
        model=settings.llm_model,
        messages=[
            {"role": "system", "content": system_msg},
            {"role": "user", "content": user},
        ],
        temperature=0.4,
    )
    return (resp.choices[0].message.content or "").strip()


async def summarize_article(
    session_or_store: Union[object, StateStore], settings: Settings, article: NormalizedArticle
) -> str:
    """Summarize an article, using PostgreSQL if available, otherwise StateStore."""
    from sqlalchemy.ext.asyncio import AsyncSession
    from app.repositories.articles import ArticleRepository
    
    use_db = isinstance(session_or_store, AsyncSession)
    
    if use_db:
        repo = ArticleRepository(session_or_store)
        # Try to get cached summary from PostgreSQL
        cached = await repo.get_summary(article.id)
        if cached:
            return cached
    else:
        store = session_or_store
        # Try to get cached summary from StateStore
        cached = store.get_article_summary(article.id)
        if cached:
            return cached
    
    # Generate new summary
    system_msg = system.EDITOR_SYSTEM_PROMPT
    user = build_summarize_prompt(article)
    summary = _complete(settings, system_msg, user)
    
    # Save summary
    if use_db:
        await repo.set_summary(article.id, summary)
        await session_or_store.commit()
    else:
        store.set_article_summary(article.id, summary)
    
    return summary


async def generate_draft(
    session_or_store: Union[object, StateStore],
    settings: Settings,
    article: NormalizedArticle,
    platform: Platform,
    draft_id: str | None = None,
) -> ContentDraft:
    """Generate a draft for a platform, using PostgreSQL if available."""
    from sqlalchemy.ext.asyncio import AsyncSession
    from app.repositories.drafts import DraftRepository
    from app.models.db_models import DraftDB
    from datetime import UTC, datetime
    
    summary = await summarize_article(session_or_store, settings, article)
    system_msg = system.GENERATOR_SYSTEM_PROMPT
    
    use_db = isinstance(session_or_store, AsyncSession)
    
    if platform == "linkedin":
        body = _complete(settings, system_msg, li_prompts.build_linkedin_prompt(article, summary))
        body = li_prompts.post_process_linkedin(body)
    elif platform == "x":
        framer_url = ""
        # Try to find a framer draft to link to
        if use_db:
            draft_repo = DraftRepository(session_or_store)
            drafts, _ = await draft_repo.list_drafts(article_id=article.id)
            framer_draft = next((d for d in drafts if d.platform == "framer"), None)
        else:
            drafts = session_or_store.list_drafts(article.id)
            framer_draft = next((d for d in drafts if d.platform == "framer"), None)
        
        if framer_draft:
            try:
                data = json.loads(framer_draft.body)
                slug = data.get("slug_slug", "")
                if slug:
                    framer_url = f"{settings.framer_base_url}/{slug}"
            except:
                pass
        
        raw = _complete(settings, system_msg, x_prompts.build_x_prompt(article, summary, framer_url))
        parts = x_prompts.split_x_thread(raw)
        body = "\n---\n".join(parts)
    elif platform == "reddit":
        raw = _complete(settings, system_msg, reddit_prompts.build_reddit_prompt(article, summary))
        title, text = reddit_prompts.parse_reddit_title_body(raw)
        body = f"{title}\n\n{text}"
    elif platform == "framer":
        raw = _complete(settings, system_msg, framer_prompts.build_framer_prompt(article, summary))
        body = _extract_json_block(raw)
    elif platform == "instagram":
        body = _complete(settings, system_msg, insta_prompts.build_instagram_prompt(article, summary))
    elif platform == "medium":
        body = _complete(settings, system_msg, medium_prompts.build_medium_prompt(article, summary))
    else:
        raise ValueError(f"Unknown platform {platform}")

    did = draft_id or (session_or_store.new_id("d_") if not use_db else f"d_{article.id}_{platform}_{datetime.now(UTC).timestamp()}")
    draft = ContentDraft(
        id=did,
        article_id=article.id,
        platform=platform,
        body=body,
        summary=summary,
        updated_at=datetime.now(UTC),
    )
    
    if use_db:
        # Save to PostgreSQL
        db_draft = DraftDB(
            id=draft.id,
            article_id=draft.article_id,
            platform=draft.platform,
            body=draft.body,
            summary=draft.summary,
        )
        draft_repo = DraftRepository(session_or_store)
        await draft_repo.upsert(db_draft)
        await session_or_store.commit()
    else:
        # Save to StateStore
        session_or_store.upsert_draft(draft)
    
    return draft


def _extract_json_block(text: str) -> str:
    text = text.strip()
    m = re.search(r"\{[\s\S]*\}", text)
    if not m:
        return text
    blob = m.group(0)
    try:
        json.loads(blob)
        return blob
    except json.JSONDecodeError:
        return text


def get_combined_prompt(platform: Platform, article: NormalizedArticle, **kwargs) -> str:
    """Get the combined prompt for a platform that generates both summary and draft."""
    if platform == "linkedin":
        return li_prompts.build_linkedin_combined_prompt(article)
    elif platform == "x":
        framer_url = kwargs.get("framer_url", "")
        return x_prompts.build_x_combined_prompt(article, framer_url)
    elif platform == "reddit":
        return reddit_prompts.build_reddit_combined_prompt(article)
    elif platform == "framer":
        return framer_prompts.build_framer_combined_prompt(article)
    elif platform == "instagram":
        return insta_prompts.build_instagram_combined_prompt(article)
    elif platform == "medium":
        return medium_prompts.build_medium_combined_prompt(article)
    else:
        raise ValueError(f"Unknown platform {platform}")


def post_process(platform: Platform, body: str) -> str:
    """Apply platform-specific post-processing to the draft body."""
    if platform == "linkedin":
        return li_prompts.post_process_linkedin(body)
    elif platform == "x":
        parts = x_prompts.split_x_thread(body)
        return "\n---\n".join(parts)
    elif platform == "reddit":
        title, text = reddit_prompts.parse_reddit_title_body(body)
        return f"{title}\n\n{text}"
    elif platform == "framer":
        return _extract_json_block(body)
    else:
        return body


async def generate_draft_single_call(
    session_or_store: Union[object, StateStore],
    settings: Settings,
    article: NormalizedArticle,
    platform: Platform,
    draft_id: str | None = None,
) -> ContentDraft:
    """Generate draft with a SINGLE LLM call (summary + platform content combined).
    
    This is more efficient than the two-call approach:
    - 50% fewer LLM calls
    - 50% faster generation
    - 50% lower API costs
    """
    from sqlalchemy.ext.asyncio import AsyncSession
    from app.repositories.drafts import DraftRepository
    from app.models.db_models import DraftDB
    from datetime import UTC, datetime
    
    use_db = isinstance(session_or_store, AsyncSession)
    
    # Get combined prompt for platform
    prompt = get_combined_prompt(platform, article)
    
    # Single LLM call
    response = _complete(settings, system.GENERATOR_SYSTEM_PROMPT, prompt)
    
    # Parse JSON response
    try:
        # Try to extract JSON from the response
        json_str = _extract_json_block(response)
        data = json.loads(json_str)
        summary = data.get("summary", "")
        body = data.get("draft", response)
    except (json.JSONDecodeError, KeyError):
        # Fallback: use response as-is if JSON parsing fails
        log.warning("Failed to parse JSON from LLM response, using raw response")
        summary = response[:500]  # Use first 500 chars as summary
        body = response
    
    # Apply platform-specific post-processing
    body = post_process(platform, body)
    
    # Generate draft ID
    did = draft_id or (session_or_store.new_id("d_") if not use_db else f"d_{article.id}_{platform}_{datetime.now(UTC).timestamp()}")
    
    # Create draft object
    draft = ContentDraft(
        id=did,
        article_id=article.id,
        platform=platform,
        body=body,
        summary=summary,
        updated_at=datetime.now(UTC),
    )
    
    # Save draft
    if use_db:
        db_draft = DraftDB(
            id=draft.id,
            article_id=draft.article_id,
            platform=draft.platform,
            body=draft.body,
            summary=draft.summary,
        )
        draft_repo = DraftRepository(session_or_store)
        await draft_repo.upsert(db_draft)
        await session_or_store.commit()
    else:
        session_or_store.upsert_draft(draft)
    
    log.info("Generated draft for %s using single LLM call (id=%s)", platform, did)
    return draft
