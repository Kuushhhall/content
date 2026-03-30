import json
import logging
import subprocess
import uuid
import html
from pathlib import Path

from app.core.config import Settings
from app.models.draft import ContentDraft
from app.models.publish import PublishResult

log = logging.getLogger(__name__)

BRIDGE_DIR = Path(__file__).parent / "framer_bridge"
BRIDGE_SCRIPT = BRIDGE_DIR / "publish.mjs"


def publish(draft: ContentDraft, settings: Settings) -> PublishResult:
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

    # Parse draft body — could be JSON (from LLM) or plain text
    try:
        fields = json.loads(draft.body)
        log.info(f"Successfully parsed JSON for draft {draft.id}, fields: {list(fields.keys())}")
    except json.JSONDecodeError as e:
        log.warning(f"Failed to parse JSON for draft {draft.id}: {e}")
        fields = {}

    # Enhanced field extraction with better fallbacks
    title = fields.get("title") or fields.get("Title") or "Legal Update"
    slug_raw = fields.get("slug_slug") or fields.get("slug") or fields.get("Slug") or title
    slug = slug_raw.lower().replace(" ", "-").replace("'", "").replace("/", "-").replace(":", "-")[:80]
    
    # Extract excerpt with multiple fallback options
    excerpt = (
        fields.get("excerpt") or 
        fields.get("excerpt") or 
        fields.get("Excerpt") or 
        fields.get("summary") or 
        fields.get("Summary") or 
        draft.body[:200] if draft.body else "Legal analysis content"
    )
    
    # Extract content with multiple fallback options, prioritizing markdown
    content = (
        fields.get("body_md") or 
        fields.get("body_md") or 
        fields.get("Body_md") or 
        fields.get("content") or 
        fields.get("Content") or 
        fields.get("body") or 
        fields.get("Body") or 
        draft.body or 
        "Content not available"
    )
    
    # Decode HTML entities to fix issues like & becoming &
    title = html.unescape(title)
    excerpt = html.unescape(excerpt)
    content = html.unescape(content)
    
    log.info(f"Extracted fields for Framer: title='{title[:50]}...', slug='{slug}', excerpt='{excerpt[:100]}...'")

    # Build payload with Framer Internal Field IDs
    payload = {
        "title": title,
        "slug": slug,
        "excerpt": excerpt,
        "content": content,
        "field_ids": {
            "title": settings.framer_field_title,
            "excerpt": settings.framer_field_excerpt,
            "content": settings.framer_field_content,
        },
    }

    project_url = settings.framer_project_id
    if not project_url.startswith("http"):
        project_url = f"https://framer.com/projects/{project_url}"

    try:
        # Validate payload before sending to bridge
        if not payload.get("title") or not payload.get("content"):
            return PublishResult(
                platform="framer", success=False,
                message="Missing required fields: title and content are required"
            )
        
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
