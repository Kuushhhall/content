import json
import logging
import re
from typing import Literal, Union

from openai import OpenAI

from app.core.config import Settings
from app.llm.prompts import prompts, system_prompts
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
        raise ValueError("OpenAI API key not configured. Set OPENAI_API_KEY in your .env file.")
    client = _client(settings)
    resp = client.chat.completions.create(
        model=settings.llm_model,
        messages=[
            {"role": "system", "content": system_msg},
            {"role": "user", "content": user},
        ],
        temperature=0.3,
    )
    return (resp.choices[0].message.content or "").strip()


def _best_content(article: NormalizedArticle) -> str:
    """Return the richest content available for the article, capped at 4000 chars."""
    content = article.full_content or article.raw_excerpt or article.summary_hint or article.title
    return content[:4000]


async def generate_draft(
    session_or_store: Union[object, StateStore],
    settings: Settings,
    article: NormalizedArticle,
    platform: Platform,
    draft_id: str | None = None,
    linkedin_target: str = "profile",
) -> ContentDraft:
    """Generate a platform-specific draft using the article's full content."""
    from datetime import UTC, datetime

    content = _best_content(article)
    system_msg = system_prompts.GENERATOR_SYSTEM_PROMPT

    if platform == "linkedin":
        body = _complete(settings, system_msg, prompts.build_linkedin_prompt(article, content, target=linkedin_target))
    elif platform == "x":
        body = _complete(settings, system_msg, prompts.build_x_prompt(article, content))
        parts = prompts.split_x_thread(body)
        body = "\n---\n".join(parts)
    elif platform == "reddit":
        body = _complete(settings, system_msg, prompts.build_reddit_prompt(article, content))
        title, text = prompts.parse_reddit_title_body(body)
        body = f"{title}\n\n{text}"
    elif platform == "framer":
        body = _complete(settings, system_msg, prompts.build_framer_prompt(article, content))
        body = _extract_json_block(body)
    elif platform == "instagram":
        body = _complete(settings, system_msg, prompts.build_instagram_prompt(article, content))
    elif platform == "medium":
        body = _complete(settings, system_msg, prompts.build_medium_prompt(article, content))
    else:
        raise ValueError(f"Unknown platform: {platform}")

    did = draft_id or session_or_store.new_id("d_")
    draft = ContentDraft(
        id=did,
        article_id=article.id,
        platform=platform,
        body=body,
        summary=article.title,
        updated_at=datetime.now(UTC),
    )
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
