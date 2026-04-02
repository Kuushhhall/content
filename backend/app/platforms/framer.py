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


def publish(draft: ContentDraft, settings: Settings, as_draft: bool = False) -> PublishResult:
    """Publish a draft to Framer CMS."""
    if not all([settings.framer_api_token, settings.framer_project_id, settings.framer_collection_id]):
        return PublishResult(
            platform="framer", success=False,
            message="Missing FRAMER_API_TOKEN, FRAMER_PROJECT_ID, or FRAMER_COLLECTION_ID",
        )

    if not BRIDGE_SCRIPT.exists():
        return PublishResult(
            platform="framer", success=False,
            message=f"Framer bridge not found at {BRIDGE_SCRIPT}",
        )

    try:
        fields = json.loads(draft.body)
    except json.JSONDecodeError:
        fields = {
            "title": draft.summary or "Legal Update",
            "excerpt": draft.body[:200] if draft.body else "",
            "content": draft.body or "",
            "type": "news",
            "categories": [],
            "sources": [],
        }

    if "fieldData" in fields and isinstance(fields["fieldData"], dict):
        fd = fields["fieldData"]
        fields = {
            "title": fd.get("Title") or fd.get("Heading") or draft.summary or "Legal Update",
            "excerpt": fd.get("Excerpt") or fd.get("SubHeading") or "",
            "content": fd.get("Content") or "",
            "type": "news",
            "categories": [],
            "sources": [],
        }

    title = html.unescape(fields.get("title") or "Legal Update")
    excerpt = html.unescape(fields.get("excerpt") or "")
    content_html = fields.get("content") or "<p>Content not available</p>"
    categories = fields.get("categories") or []
    sources = fields.get("sources") or []
    image_url = fields.get("image_url")

    if content_html and not content_html.strip().startswith("<"):
        content_html = html.unescape(content_html)

    if image_url:
        content_html = f'<img src="{html.escape(image_url, quote=True)}" alt="{html.escape(title, quote=True)}" style="max-width:100%;height:auto;" />\n' + content_html

    if sources:
        sources_html = "\n<h2>Sources</h2>\n<ul>\n"
        for src in sources:
            src_title = src.get("title", "Source")
            src_url = src.get("url", "#")
            sources_html += f'<li><a href="{src_url}" target="_blank">{src_title}</a></li>\n'
        sources_html += "</ul>\n"
        content_html += sources_html

    slug_base = re.sub(r"[^a-z0-9\-]", "", title.lower().replace(" ", "-").replace("'", "").replace('"', "").replace("/", "-").replace(":", "-").replace(".", "-"))
    slug_base = re.sub(r"-{2,}", "-", slug_base).strip("-")[:72]
    if not slug_base:
        slug_base = "legal-update"
    hash_suffix = hashlib.sha256(draft.id.encode()).hexdigest()[:6]
    slug = f"{slug_base}-{hash_suffix}"

    _cat_id = None
    if categories:
        _cat_id = settings.framer_category_map.get(categories[0])
    news_category = _cat_id or "O2Ry36OcG"

    f_title = settings.framer_field_title
    f_excerpt = settings.framer_field_excerpt
    f_snippet = settings.framer_field_body_snippet
    f_content = settings.framer_field_content
    f_featured = settings.framer_field_featured
    f_category = settings.framer_field_category

    field_data = {
        f_title: {"type": "string", "value": title},
        f_excerpt: {"type": "string", "value": excerpt},
        f_snippet: {"type": "string", "value": excerpt[:300]},
        f_content: {"type": "formattedText", "value": content_html},
        f_featured: {"type": "boolean", "value": False},
        f_category: {"type": "collectionReference", "value": news_category},
    }

    payload = {"fieldData": field_data, "draft": as_draft}

    project_url = settings.framer_project_id or ""
    if not project_url.startswith("http"):
        project_url = f"https://framer.com/projects/{project_url}"

    api_token = settings.framer_api_token or ""
    collection_id = settings.framer_collection_id or ""

    try:
        result = subprocess.run(
            ["node", str(BRIDGE_SCRIPT), project_url, api_token, collection_id, json.dumps(payload)],
            capture_output=True, text=True, timeout=60, cwd=str(BRIDGE_DIR),
        )

        stdout = result.stdout.strip()
        stderr = result.stderr.strip()

        if not stdout:
            return PublishResult(platform="framer", success=False, message=stderr or "No output from bridge")

        data = json.loads(stdout)
        if data.get("success"):
            return PublishResult(platform="framer", success=True, external_id=data.get("id", str(uuid.uuid4())), raw=data)
        else:
            return PublishResult(platform="framer", success=False, message=data.get("error", "Unknown error"), raw=data)

    except subprocess.TimeoutExpired:
        return PublishResult(platform="framer", success=False, message="Bridge timed out (60s)")
    except FileNotFoundError:
        return PublishResult(platform="framer", success=False, message="Node.js not found")
    except Exception as e:
        return PublishResult(platform="framer", success=False, message=str(e))
