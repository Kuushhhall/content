import hashlib
import json
import logging
import re
from difflib import get_close_matches
from typing import Literal, Union

from openai import OpenAI

from app.core.config import Settings
from app.llm.prompts import prompts, system_prompts
from app.models.article import NormalizedArticle
from app.models.draft import ContentDraft
from app.state.store import StateStore

log = logging.getLogger(__name__)

# Trusted domains for source validation — must match or contain one of these
_TRUSTED_SOURCE_DOMAINS = [
    "livelaw.in", "barandbench.com", "scconline.com", "indiankanoon.org",
    "supremecourtofindia.nic.in", "economictimes.indiatimes.com", "lawstreet.in",
    "verdictum.in", "latestlaws.com", "legalserviceindia.com", "thehindu.com",
    "ndtv.com", "hindustantimes.com", "theprint.in", "scroll.in",
    "reuters.com", "bbc.com", "theguardian.com",
]

_VALID_CATEGORIES = [
    "Litigation",
    "AI in Legal",
    "Legal Tech & AI",
    "Regulatory",
    "Legal Guides",
    "Judgements & Cases",
    "Disputes & Enforcement",
    "Compliance & Risk",
    "Commercial & Transactions",
    "Legal Updates",
    "Product & Company Update",
    "Types of Contracts",
    "Due Diligence",
]

Platform = Literal["linkedin", "x", "reddit", "framer", "medium", "instagram"]


def _client(settings: Settings) -> OpenAI:
    kwargs = {}
    if settings.openai_api_key:
        kwargs["api_key"] = settings.openai_api_key
    if settings.openai_base_url:
        kwargs["base_url"] = settings.openai_base_url
    return OpenAI(**kwargs)


def _complete_with_usage(settings: Settings, system_msg: str, user: str) -> tuple[str, dict]:
    """Call LLM and return (text, usage_dict). usage_dict has prompt_tokens, completion_tokens, total_tokens."""
    if not settings.openai_api_key:
        raise ValueError("OpenAI API key not configured. Set OPENAI_API_KEY in your .env file.")
    client = _client(settings)
    resp = client.chat.completions.create(
        model=settings.llm_model or "",
        messages=[
            {"role": "system", "content": system_msg},
            {"role": "user", "content": user},
        ],
    )
    usage = resp.usage
    return (resp.choices[0].message.content or "").strip(), {
        "prompt_tokens": usage.prompt_tokens if usage else 0,
        "completion_tokens": usage.completion_tokens if usage else 0,
        "total_tokens": usage.total_tokens if usage else 0,
    }


def _complete(settings: Settings, system_msg: str, user: str) -> str:
    text, _ = _complete_with_usage(settings, system_msg, user)
    return text



def select_best_article_by_title(
    candidates: list[NormalizedArticle],
    settings: Settings,
) -> tuple[NormalizedArticle, dict]:
    """LLM picks highest-impact article using titles + short snippets only (token-efficient).

    Returns (selected_article, usage_dict) so callers can record cost.
    """
    items = "\n".join(
        f"{i+1}. [{a.source}] {a.title}\n   {(a.summary_hint or '')[:150]}"
        for i, a in enumerate(candidates[:15])
    )
    prompt = f"""You are a legal news editor for lawxy.com, an Indian legal news platform.

{min(len(candidates), 15)} recent Indian legal news articles are listed below. Pick the ONE article that will:
- Get the highest click volume and reader engagement
- Cover a broadly relevant topic for lawyers, law students, and businesses in India
- Be genuinely newsworthy (landmark judgment, major legislation, high-stakes dispute, or viral legal issue)

Articles:
{items}

Respond with ONLY the article number (e.g. "3"). No explanation."""

    resp, usage = _complete_with_usage(settings, "You are a helpful assistant.", prompt)
    m = re.search(r'\b(\d+)\b', resp.strip())
    if m:
        idx = int(m.group(1)) - 1
        if 0 <= idx < len(candidates):
            log.info("LLM selected article #%d: %r", idx + 1, candidates[idx].title)
            return candidates[idx], usage
    log.warning("LLM selection parse failed (resp=%r), using first candidate", resp)
    return candidates[0], usage


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
        draft, _ = await generate_framer_draft(session_or_store, settings, article, draft_id=draft_id)
        return draft
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
        # Strip control characters (except \n \r \t which are valid in JSON strings)
        cleaned = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', blob)
        try:
            json.loads(cleaned)
            return cleaned
        except json.JSONDecodeError:
            return text


# ============================================================================
# SINGLE-CALL FRAMER PIPELINE
# ============================================================================



def _fuzzy_map_category(raw: str) -> str | None:
    """Map a raw LLM category string to the nearest valid category using fuzzy matching."""
    if raw in _VALID_CATEGORIES:
        return raw
    matches = get_close_matches(raw, _VALID_CATEGORIES, n=1, cutoff=0.6)
    if matches:
        log.info(f"Fuzzy mapped category '{raw}' → '{matches[0]}'")
        return matches[0]
    return None


def _is_trusted_source_url(url: str) -> bool:
    """Return True only if the URL belongs to a known trusted domain."""
    url_lower = url.lower()
    return any(domain in url_lower for domain in _TRUSTED_SOURCE_DOMAINS)


def _sanitize_html(content: str) -> str:
    """
    Strip tags Framer doesn't handle well and convert any markdown headers that
    slipped through (LLMs sometimes mix markdown and HTML).
    Allowed: h1 h2 h3 p ul ol li strong em blockquote a
    """
    # Convert markdown-style headers that escaped HTML conversion
    content = re.sub(r"^### (.+)$", r"<h3>\1</h3>", content, flags=re.MULTILINE)
    content = re.sub(r"^## (.+)$", r"<h2>\1</h2>", content, flags=re.MULTILINE)
    content = re.sub(r"^# (.+)$", r"<h1>\1</h1>", content, flags=re.MULTILINE)
    # Strip div/span/style/class attributes — Framer formattedText doesn't need them
    content = re.sub(r"<(div|span)[^>]*>", "", content)
    content = re.sub(r"</(div|span)>", "", content)
    content = re.sub(r'\s+style="[^"]*"', "", content)
    content = re.sub(r"\s+class=\"[^\"]*\"", "", content)
    return content.strip()


def _parse_and_validate_framer_output(raw: str) -> dict:
    """Parse LLM output and validate/sanitize structure. No extra LLM calls."""
    json_str = _extract_json_block(raw)

    try:
        data = json.loads(json_str)
    except json.JSONDecodeError as e:
        log.warning(f"Failed to parse Framer JSON: {e}")
        return {
            "type": "news",
            "categories": [],
            "title": "Legal Update",
            "excerpt": raw[:200] if raw else "Legal analysis content",
            "content": f"<p>{raw}</p>" if raw else "<p>Content not available</p>",
            "sources": [],
        }

    # --- Type ---
    valid_types = ["news", "guide", "opinion", "explainer"]
    if data.get("type") not in valid_types:
        data["type"] = "news"

    # --- Categories: fuzzy match, cap at 3 ---
    raw_categories = data.get("categories", [])[:3]
    mapped = [_fuzzy_map_category(c) for c in raw_categories if isinstance(c, str)]
    data["categories"] = [c for c in mapped if c is not None]

    # --- Required fields with defaults ---
    data.setdefault("title", "Legal Update")
    data.setdefault("excerpt", "")
    data.setdefault("content", "<p>Content not available</p>")
    data.setdefault("sources", [])

    # --- Sanitize HTML content ---
    data["content"] = _sanitize_html(data["content"])

    # --- Quality gate: reject low-quality drafts before they ever reach Framer ---
    title_words = len(data["title"].split())
    content_len = len(re.sub(r"<[^>]+>", "", data["content"]))  # strip tags for length check
    if title_words < 4:
        log.warning(f"Framer draft quality gate: title too short ({title_words} words), using fallback")
        data["title"] = "Legal Update — " + data["title"]
    if content_len < 300:
        log.warning(f"Framer draft quality gate: content too short ({content_len} chars)")
        # Don't block — but flag it so it's visible in logs

    # --- Sources: only keep URLs from trusted domains, discard hallucinated ones ---
    if not isinstance(data["sources"], list):
        data["sources"] = []
    cleaned_sources = []
    for src in data["sources"]:
        if not (isinstance(src, dict) and "title" in src and "url" in src):
            continue
        url = str(src["url"])
        if not _is_trusted_source_url(url):
            log.info(f"Dropped untrusted source URL: {url}")
            continue
        cleaned_sources.append({
            "title": str(src["title"])[:200],
            "url": url[:500],
        })
    data["sources"] = cleaned_sources[:3]

    log.info(
        f"Validated Framer output: type={data['type']}, categories={data['categories']}, "
        f"sources={len(data['sources'])}, content_chars={content_len}"
    )
    return data


async def generate_framer_draft(
    session_or_store: Union[object, StateStore],
    settings: Settings,
    article: NormalizedArticle,
    draft_id: str | None = None,
) -> tuple[ContentDraft, dict]:
    """Generate Framer-ready draft in ONE LLM call."""
    from datetime import UTC, datetime

    # Note: no duplicate check here — callers (pipeline routes) are responsible for
    # selecting fresh articles. Always generate a new draft so it gets pushed to Framer.

    content = _best_content(article)
    system_msg = system_prompts.GENERATOR_SYSTEM_PROMPT

    raw_output, _gen_usage = _complete_with_usage(
        settings,
        system_msg,
        prompts.build_framer_master_prompt(article, content),
    )

    parsed = _parse_and_validate_framer_output(raw_output)

    # Always ensure the original article URL is included as a source
    existing_urls = {s.get("url") for s in parsed.get("sources", [])}
    if article.url and article.url not in existing_urls:
        parsed.setdefault("sources", []).insert(0, {
            "title": article.title or article.source,
            "url": article.url,
        })

    # Inject article image if available and not already set
    if article.image_url and not parsed.get("image_url"):
        parsed["image_url"] = article.image_url

    did = draft_id or session_or_store.new_id("d_")
    draft = ContentDraft(
        id=did,
        article_id=article.id,
        platform="framer",
        body=json.dumps(parsed),
        summary=parsed.get("title", article.title),
        updated_at=datetime.now(UTC),
    )
    session_or_store.upsert_draft(draft)

    log.info(f"Generated Framer draft {did}: type={parsed['type']}, categories={parsed['categories']}")
    return draft, _gen_usage
