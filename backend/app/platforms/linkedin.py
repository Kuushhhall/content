import json
import logging
import uuid

import httpx

from app.core.config import Settings
from app.models.draft import ContentDraft
from app.models.publish import PublishResult

log = logging.getLogger(__name__)

LINKEDIN_UGC_URL = "https://api.linkedin.com/v2/ugcPosts"


def publish(draft: ContentDraft, settings: Settings) -> PublishResult:
    if not settings.linkedin_access_token or not settings.linkedin_person_urn:
        return PublishResult(
            platform="linkedin",
            success=False,
            message="Missing LINKEDIN_ACCESS_TOKEN or LINKEDIN_PERSON_URN",
        )

    author = settings.linkedin_person_urn
    if not author.startswith("urn:"):
        author = f"urn:li:person:{author}"

    payload = {
        "author": author,
        "lifecycleState": "PUBLISHED",
        "specificContent": {
            "com.linkedin.ugc.ShareContent": {
                "shareCommentary": {"text": draft.body},
                "shareMediaCategory": "NONE",
            }
        },
        "visibility": {"com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"},
    }
    headers = {
        "Authorization": f"Bearer {settings.linkedin_access_token}",
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
    }
    try:
        with httpx.Client(timeout=60.0) as client:
            r = client.post(LINKEDIN_UGC_URL, headers=headers, content=json.dumps(payload))
            if r.status_code >= 400:
                return PublishResult(
                    platform="linkedin",
                    success=False,
                    message=f"HTTP {r.status_code}: {r.text[:500]}",
                    raw={"status": r.status_code, "body": r.text[:1000]},
                )
            data = r.json() if r.text else {}
            pid = data.get("id") or str(uuid.uuid4())
            return PublishResult(
                platform="linkedin",
                success=True,
                external_id=pid,
                raw=data,
            )
    except Exception as e:
        log.exception("LinkedIn publish failed")
        return PublishResult(platform="linkedin", success=False, message=str(e))
