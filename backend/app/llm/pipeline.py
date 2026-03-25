import json
import logging
import re
from typing import Literal

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


def summarize_article(
    store: StateStore, settings: Settings, article: NormalizedArticle
) -> str:
    cached = store.get_article_summary(article.id)
    if cached:
        return cached
    system_msg = system.EDITOR_SYSTEM_PROMPT
    user = build_summarize_prompt(article)
    summary = _complete(settings, system_msg, user)
    store.set_article_summary(article.id, summary)
    return summary


def generate_draft(
    store: StateStore,
    settings: Settings,
    article: NormalizedArticle,
    platform: Platform,
    draft_id: str | None = None,
) -> ContentDraft:
    summary = summarize_article(store, settings, article)
    system_msg = system.GENERATOR_SYSTEM_PROMPT
    
    if platform == "linkedin":
        body = _complete(settings, system_msg, li_prompts.build_linkedin_prompt(article, summary))
        body = li_prompts.post_process_linkedin(body)
    elif platform == "x":
        framer_url = ""
        # Try to find a framer draft to link to
        drafts = store.list_drafts(article.id)
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

    from datetime import UTC, datetime

    did = draft_id or store.new_id("d_")
    draft = ContentDraft(
        id=did,
        article_id=article.id,
        platform=platform,
        body=body,
        summary=summary,
        updated_at=datetime.now(UTC),
    )
    store.upsert_draft(draft)
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
