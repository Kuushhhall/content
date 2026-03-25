import json
import logging
import subprocess
import uuid
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
    except json.JSONDecodeError:
        fields = {}

    title = fields.get("title", "Legal Update")
    slug_raw = fields.get("slug_slug") or fields.get("slug") or title
    slug = slug_raw.lower().replace(" ", "-").replace("'", "")[:80]
    excerpt = fields.get("excerpt", draft.body[:200])
    content = fields.get("body_md") or fields.get("content") or fields.get("body") or draft.body

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
        if not stdout:
            return PublishResult(
                platform="framer", success=False,
                message=result.stderr.strip() or "No output from bridge",
            )

        data = json.loads(stdout)
        if data.get("success"):
            return PublishResult(
                platform="framer", success=True,
                external_id=data.get("id", str(uuid.uuid4())),
                raw=data,
            )
        return PublishResult(platform="framer", success=False, message=data.get("error", "Unknown"), raw=data)

    except subprocess.TimeoutExpired:
        return PublishResult(platform="framer", success=False, message="Bridge timed out (60s)")
    except json.JSONDecodeError as e:
        return PublishResult(platform="framer", success=False, message=f"Invalid JSON from bridge: {e}")
    except FileNotFoundError:
        return PublishResult(platform="framer", success=False, message="Node.js not found")
    except Exception as e:
        log.exception("Framer publish failed")
        return PublishResult(platform="framer", success=False, message=str(e))
