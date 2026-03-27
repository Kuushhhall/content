import json
import logging
import uuid

import httpx

from app.core.config import Settings
from app.models.draft import ContentDraft
from app.models.publish import PublishResult

log = logging.getLogger(__name__)

# New Posts API endpoint (replaces deprecated UGC Posts API)
LINKEDIN_POSTS_URL = "https://api.linkedin.com/rest/posts"
LINKEDIN_VERSION = "202401"


def publish(draft: ContentDraft, settings: Settings) -> PublishResult:
    if not settings.linkedin_access_token:
        return PublishResult(
            platform="linkedin",
            success=False,
            message="Missing LINKEDIN_ACCESS_TOKEN",
        )

    # Determine author URN - prefer organization ID for company page posting
    if settings.linkedin_organization_id:
        author = f"urn:li:organization:{settings.linkedin_organization_id}"
    elif settings.linkedin_person_urn:
        author = settings.linkedin_person_urn
        if not author.startswith("urn:"):
            author = f"urn:li:person:{author}"
    else:
        return PublishResult(
            platform="linkedin",
            success=False,
            message="Missing LINKEDIN_ORGANIZATION_ID or LINKEDIN_PERSON_URN",
        )

    # New Posts API payload structure
    payload = {
        "author": author,
        "commentary": draft.body,
        "visibility": "PUBLIC",
        "distribution": {
            "feedDistribution": "MAIN_FEED",
            "targetEntities": [],
            "thirdPartyDistributionChannels": []
        },
        "lifecycleState": "PUBLISHED",
        "isReshareDisabledByAuthor": False
    }
    
    # Required headers for Posts API
    headers = {
        "Authorization": f"Bearer {settings.linkedin_access_token}",
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
        "LinkedIn-Version": LINKEDIN_VERSION,
    }
    try:
        with httpx.Client(timeout=60.0) as client:
            r = client.post(LINKEDIN_POSTS_URL, headers=headers, content=json.dumps(payload))
            if r.status_code >= 400:
                error_msg = f"LinkedIn API error: HTTP {r.status_code}: {r.text[:500]}"
                log.error(error_msg)
                return PublishResult(
                    platform="linkedin",
                    success=False,
                    message=error_msg,
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
    except httpx.TimeoutException:
        error_msg = "LinkedIn API request timed out"
        log.error(error_msg)
        return PublishResult(platform="linkedin", success=False, message=error_msg)
    except httpx.HTTPStatusError as e:
        error_msg = f"LinkedIn API HTTP error: {e.response.status_code} - {e.response.text[:500]}"
        log.error(error_msg)
        return PublishResult(platform="linkedin", success=False, message=error_msg)
    except Exception as e:
        error_msg = f"LinkedIn publish failed: {str(e)}"
        log.exception(error_msg)
        return PublishResult(platform="linkedin", success=False, message=error_msg)
