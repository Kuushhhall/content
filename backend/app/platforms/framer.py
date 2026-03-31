import hashlib
import html
import json
import logging
import re
import subprocess
import uuid
from datetime import datetime, timezone
from pathlib import Path

from app.core.config import Settings
from app.models.draft import ContentDraft
from app.models.publish import PublishResult

log = logging.getLogger(__name__)

BRIDGE_DIR = Path(__file__).parent / "framer_bridge"
BRIDGE_SCRIPT = BRIDGE_DIR / "publish.mjs"


def markdown_to_html(md: str) -> str:
    """Convert markdown to HTML for Framer CMS.
    
    Framer's formattedText field requires HTML, not markdown.
    """
    if not md:
        return ""
    
    try:
        import markdown
        return markdown.markdown(md)
    except ImportError:
        log.warning("markdown library not installed, using basic conversion")
        # Fallback basic conversion
        lines = md.split("\n")
        html_lines = []
        for line in lines:
            line = line.strip()
            if not line:
                continue
            if line.startswith("### "):
                html_lines.append(f"<h3>{line[4:]}</h3>")
            elif line.startswith("## "):
                html_lines.append(f"<h2>{line[3:]}</h2>")
            elif line.startswith("# "):
                html_lines.append(f"<h1>{line[2:]}</h1>")
            elif line.startswith("- "):
                html_lines.append(f"<li>{line[2:]}</li>")
            elif line.startswith("**") and line.endswith("**"):
                html_lines.append(f"<p><strong>{line[2:-2]}</strong></p>")
            else:
                html_lines.append(f"<p>{line}</p>")
        return "\n".join(html_lines)


def build_articles_payload(title: str, slug: str, excerpt: str, content_html: str,
                           image_url: str | None = None, author: str | None = None,
                           featured: bool = False, categories: list[str] | None = None,
                           sources: list[dict] | None = None, content_type: str = "news",
                           settings: Settings | None = None) -> dict:
    """Build payload for Articles collection using real Framer field IDs from settings."""

    # Append sources as HTML before sending content
    if sources:
        sources_html = "\n<h2>Sources</h2>\n<ul>\n"
        for src in sources:
            src_title = src.get("title", "Source")
            src_url = src.get("url", "#")
            sources_html += f'<li><a href="{src_url}" target="_blank">{src_title}</a></li>\n'
        sources_html += "</ul>\n"
        content_html += sources_html

    # Use field IDs from settings (real Framer CMS field identifiers)
    f_title    = settings.framer_field_title    if settings else "nBgCz8K8L"
    f_excerpt  = settings.framer_field_excerpt  if settings else "o53lUZksT"
    f_content  = settings.framer_field_content  if settings else "PLMxi7gVr"
    f_date     = settings.framer_field_date     if settings else "PvtA6HuXW"
    f_featured = settings.framer_field_featured if settings else "xzLICDaOl"
    f_author   = settings.framer_field_author   if settings else "gcbaFf1HP"
    f_cats     = settings.framer_field_categories if settings else "km6kk8mHT"

    field_data: dict = {
        f_title:    {"type": "string",        "value": title},
        f_excerpt:  {"type": "string",        "value": excerpt},
        f_content:  {"type": "formattedText", "value": content_html},
        f_date:     {"type": "date",          "value": datetime.now(timezone.utc).isoformat()},
        f_featured: {"type": "boolean",       "value": featured},
    }

    if author:
        field_data[f_author] = {"type": "collectionReference", "value": author}

    # Map category names → slugs via settings.framer_category_map
    if categories and settings:
        cat_slugs = []
        for cat in categories:
            slug_val = settings.framer_category_map.get(cat)
            if slug_val:
                cat_slugs.append(slug_val)
        if cat_slugs:
            field_data[f_cats] = {"type": "multiCollectionReference", "value": cat_slugs}

    return {"fieldData": field_data}


def build_news_payload(title: str, slug: str, excerpt: str, content_html: str,
                       image_url: str | None = None, author: str | None = None,
                       featured: bool = False, news_category: str = "O2Ry36OcG",
                       sources: list[dict] | None = None,
                       settings: Settings | None = None) -> dict:
    """Build payload for News collection using real Framer field IDs from settings.

    News collection schema (yB98Z953G):
      GlEJCucUC — Heading (string)
      H76FV4UEM — SubHeading (string)
      fFgoO6cYg — Body snippet (string)
      A11mmr7Ra — Content (formattedText)
      Fztf8IFX3 — Featured (boolean)
      YDHS8MCIi — Author (collectionReference — optional, skipped)
      EVAt7zfnx — News Category (collectionReference item ID)
      YcCvnPRvd — Image (image — requires upload; embed as <img> in content instead)
    """
    # Prepend article image at top of content if available
    if image_url:
        content_html = f'<img src="{html.escape(image_url, quote=True)}" alt="{html.escape(title, quote=True)}" style="max-width:100%;height:auto;" />\n' + content_html

    # Append sources as HTML at the end of content
    if sources:
        sources_html = "\n<h2>Sources</h2>\n<ul>\n"
        for src in sources:
            src_title = src.get("title", "Source")
            src_url = src.get("url", "#")
            sources_html += f'<li><a href="{src_url}" target="_blank">{src_title}</a></li>\n'
        sources_html += "</ul>\n"
        content_html += sources_html

    f_title    = settings.framer_field_title        if settings else "GlEJCucUC"
    f_excerpt  = settings.framer_field_excerpt      if settings else "H76FV4UEM"
    f_snippet  = settings.framer_field_body_snippet if settings else "fFgoO6cYg"
    f_content  = settings.framer_field_content      if settings else "A11mmr7Ra"
    f_featured = settings.framer_field_featured     if settings else "Fztf8IFX3"
    f_category = settings.framer_field_category     if settings else "EVAt7zfnx"

    field_data: dict = {
        f_title:    {"type": "string",        "value": title},
        f_excerpt:  {"type": "string",        "value": excerpt},
        f_snippet:  {"type": "string",        "value": excerpt[:300]},
        f_content:  {"type": "formattedText", "value": content_html},
        f_featured: {"type": "boolean",       "value": featured},
    }

    if news_category:
        field_data[f_category] = {"type": "collectionReference", "value": news_category}

    return {"fieldData": field_data}


def publish(draft: ContentDraft, settings: Settings, as_draft: bool = False) -> PublishResult:
    """Publish a draft to Framer CMS.
    
    This function handles BOTH formats:
    1. NEW single-call format: {type, categories, title, excerpt, content, sources}
    2. OLD format: {title, slug, excerpt, body_md, ...}
    
    It parses the draft body, builds the correct payload, and sends to Framer.
    """
    # Validate required settings
    if not all([settings.framer_api_token, settings.framer_project_id, settings.framer_collection_id]):
        return PublishResult(
            platform="framer", success=False,
            message="Missing FRAMER_API_TOKEN, FRAMER_PROJECT_ID, or FRAMER_COLLECTION_ID",
        )

    if not BRIDGE_SCRIPT.exists():
        return PublishResult(
            platform="framer", success=False,
            message=f"Framer bridge not found. Run 'npm install' in {BRIDGE_DIR}",
        )

    # Parse draft body — JSON from LLM
    try:
        fields = json.loads(draft.body)
        log.info(f"Successfully parsed JSON for draft {draft.id}, fields: {list(fields.keys())}")
    except json.JSONDecodeError as e:
        log.warning(f"Failed to parse JSON for draft {draft.id}: {e}")
        fields = {
            "title": draft.summary or "Legal Update",
            "excerpt": draft.body[:200] if draft.body else "",
            "content": draft.body or "",
            "type": "news",
            "categories": [],
            "sources": [],
        }

    # If the old build_framer_prompt wrapped everything inside a "fieldData" key, unwrap it
    if "fieldData" in fields and isinstance(fields["fieldData"], dict):
        log.info(f"Unwrapping fieldData wrapper for draft {draft.id}")
        fd = fields["fieldData"]
        fields = {
            "title": fd.get("Title") or fd.get("Heading") or draft.summary or "Legal Update",
            "excerpt": fd.get("Excerpt") or fd.get("SubHeading") or "",
            "content": fd.get("Content") or "",
            "type": "news",
            "categories": [],
            "sources": [],
        }

    # Now all paths use the same flat structure: {type, categories, title, excerpt, content, sources}
    title = fields.get("title") or "Legal Update"
    excerpt = fields.get("excerpt") or ""
    content_html = fields.get("content") or "<p>Content not available</p>"
    categories = fields.get("categories") or []
    sources = fields.get("sources") or []
    content_type = fields.get("type") or "news"

    # If content came from old markdown format, convert it
    if content_html and not content_html.strip().startswith("<"):
        content_html = html.unescape(content_html)
        content_html = markdown_to_html(content_html)

    # Generate a clean URL-safe slug from title, with a short hash suffix to prevent collisions
    slug_base = re.sub(r"[^a-z0-9\-]", "", title.lower().replace(" ", "-").replace("'", "").replace('"', "").replace("/", "-").replace(":", "-").replace(".", "-"))
    slug_base = re.sub(r"-{2,}", "-", slug_base).strip("-")[:72]
    if not slug_base:
        slug_base = "legal-update"
    hash_suffix = hashlib.sha256(draft.id.encode()).hexdigest()[:6]
    slug = f"{slug_base}-{hash_suffix}"

    log.info(f"Framer draft {draft.id}: type={content_type}, categories={categories}, sources={len(sources)}")
    
    title = html.unescape(title)
    excerpt = html.unescape(excerpt)
    image_url = fields.get("image_url") or fields.get("Image") or fields.get("featured_image")
    author = fields.get("author") or fields.get("Author")
    featured = bool(fields.get("featured") or fields.get("Featured") or False)
    # Map content_type to a category slug (News Category collectionReference)
    # Try to find a matching category slug from framer_category_map, else use first category or fallback
    _cat_id = None
    if categories:
        _cat_id = settings.framer_category_map.get(categories[0])
    if not _cat_id and content_type:
        _cat_id = settings.framer_category_map.get(content_type)
    # Default: AI in Legal item ID (O2Ry36OcG)
    news_category = _cat_id or "O2Ry36OcG"

    log.info(f"Extracted fields for Framer: title='{title[:50]}', slug='{slug}', content={len(content_html)} chars")

    # Build collection-specific payload
    collection_type = settings.framer_collection_type.lower()
    
    if collection_type == "news":
        payload = build_news_payload(
            title=title,
            slug=slug,
            excerpt=excerpt,
            content_html=content_html,
            image_url=image_url,
            author=author,
            featured=featured,
            news_category=news_category,
            sources=sources,
            settings=settings,
        )
    else:  # Default to articles
        payload = build_articles_payload(
            title=title,
            slug=slug,
            excerpt=excerpt,
            content_html=content_html,
            image_url=image_url,
            author=author,
            featured=featured,
            categories=categories,
            sources=sources,
            content_type=content_type,
            settings=settings
        )
    
    # Pass draft flag to bridge — True = save as unpublished CMS draft, False = publish live
    payload["draft"] = as_draft

    log.info(f"Built {collection_type} payload with fieldData keys: {list(payload['fieldData'].keys())}, draft={as_draft}")

    # Prepare project URL
    project_url = settings.framer_project_id
    if not project_url.startswith("http"):
        project_url = f"https://framer.com/projects/{project_url}"

    try:
        if not payload.get("fieldData"):
            return PublishResult(platform="framer", success=False, message="Empty fieldData — nothing to publish")

        log.info(f"Sending payload to Framer bridge for draft {draft.id}")
        result = subprocess.run(
            [
                "node", str(BRIDGE_SCRIPT),
                project_url,
                settings.framer_api_token,
                settings.framer_collection_id,
                json.dumps(payload),
            ],
            capture_output=True, text=True, timeout=60, cwd=str(BRIDGE_DIR),
        )

        stdout = result.stdout.strip()
        stderr = result.stderr.strip()
        
        if not stdout:
            error_msg = stderr or "No output from bridge"
            log.error(f"Framer bridge failed for draft {draft.id}: {error_msg}")
            return PublishResult(
                platform="framer", success=False,
                message=error_msg,
            )

        try:
            data = json.loads(stdout)
        except json.JSONDecodeError as e:
            log.error(f"Invalid JSON response from Framer bridge for draft {draft.id}: {e}")
            return PublishResult(
                platform="framer", success=False,
                message=f"Invalid JSON response from bridge: {e}",
                raw={"stdout": stdout, "stderr": stderr}
            )
        
        if data.get("success"):
            log.info(f"Framer publish successful for draft {draft.id}, external_id: {data.get('id')}")
            return PublishResult(
                platform="framer", success=True,
                external_id=data.get("id", str(uuid.uuid4())),
                raw=data,
            )
        else:
            error_msg = data.get("error", "Unknown error from Framer bridge")
            log.error(f"Framer publish failed for draft {draft.id}: {error_msg}")
            return PublishResult(
                platform="framer", success=False, 
                message=error_msg, 
                raw=data
            )

    except subprocess.TimeoutExpired:
        log.error(f"Framer bridge timed out for draft {draft.id}")
        return PublishResult(platform="framer", success=False, message="Bridge timed out (60s)")
    except FileNotFoundError:
        log.error(f"Node.js not found for Framer bridge")
        return PublishResult(platform="framer", success=False, message="Node.js not found")
    except Exception as e:
        log.exception(f"Unexpected error in Framer publish for draft {draft.id}")
        return PublishResult(platform="framer", success=False, message=str(e))