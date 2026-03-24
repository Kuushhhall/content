import json
import logging
import uuid

import httpx

from app.core.config import Settings
from app.models.draft import ContentDraft
from app.models.publish import PublishResult

log = logging.getLogger(__name__)


def publish(draft: ContentDraft, settings: Settings) -> PublishResult:
    """
    Framer CMS: expects FRAMER_API_TOKEN, FRAMER_PROJECT_ID, FRAMER_COLLECTION_ID.
    Endpoint shape may vary by project; this uses a conventional REST pattern.
    """
    if not all(
        [
            settings.framer_api_token,
            settings.framer_project_id,
            settings.framer_collection_id,
        ]
    ):
        return PublishResult(
            platform="framer",
            success=False,
            message="Missing FRAMER_API_TOKEN, FRAMER_PROJECT_ID, or FRAMER_COLLECTION_ID",
        )

    try:
        fields = json.loads(draft.body)
    except json.JSONDecodeError:
        fields = {
            "title": "Untitled",
            "slug": f"post-{uuid.uuid4().hex[:8]}",
            "excerpt": draft.body[:200],
            "body_md": draft.body,
        }

    url = (
        f"https://api.framer.com/projects/{settings.framer_project_id}"
        f"/collections/{settings.framer_collection_id}/items"
    )
    headers = {
        "Authorization": f"Bearer {settings.framer_api_token}",
        "Content-Type": "application/json",
    }
    payload = {"fields": fields}

    try:
        with httpx.Client(timeout=60.0) as client:
            r = client.post(url, headers=headers, json=payload)
            if r.status_code >= 400:
                return PublishResult(
                    platform="framer",
                    success=False,
                    message=f"HTTP {r.status_code}: {r.text[:500]}",
                    raw={"url": url},
                )
            data = r.json() if r.text else {}
            eid = str(data.get("id") or data.get("itemId") or uuid.uuid4())
            return PublishResult(platform="framer", success=True, external_id=eid, raw=data)
    except Exception as e:
        log.exception("Framer publish failed")
        return PublishResult(platform="framer", success=False, message=str(e))
