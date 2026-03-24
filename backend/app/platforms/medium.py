import logging
import re
import uuid

import httpx

from app.core.config import Settings
from app.models.draft import ContentDraft
from app.models.publish import PublishResult

log = logging.getLogger(__name__)

ME_USER_URL = "https://api.medium.com/v1/me"
ME_POST_TMPL = "https://api.medium.com/v1/users/{user_id}/posts"


def _simple_md_to_html(md: str) -> str:
    """Very small subset for MVP; Medium accepts HTML."""
    lines = md.strip().splitlines()
    parts: list[str] = []
    for line in lines:
        line = line.strip()
        if not line:
            parts.append("<br/>")
            continue
        if line.startswith("# "):
            parts.append(f"<h2>{line[2:]}</h2>")
        elif line.startswith("## "):
            parts.append(f"<h3>{line[3:]}</h3>")
        else:
            parts.append(f"<p>{line}</p>")
    return "\n".join(parts) if parts else f"<p>{md}</p>"


def _parse_medium_fields(body: str) -> tuple[str, str, str]:
    title_m = re.search(r"TITLE:\s*(.+)", body, re.I)
    sub_m = re.search(r"SUBTITLE:\s*(.+)", body, re.I)
    body_m = re.search(r"BODY_MARKDOWN:\s*([\s\S]+)", body, re.I)
    title = title_m.group(1).strip() if title_m else "Article"
    subtitle = sub_m.group(1).strip() if sub_m else ""
    md = body_m.group(1).strip() if body_m else body
    return title, subtitle, md


def publish(draft: ContentDraft, settings: Settings) -> PublishResult:
    if not settings.medium_integration_token:
        return PublishResult(
            platform="medium",
            success=False,
            message="Missing MEDIUM_INTEGRATION_TOKEN",
        )

    headers = {
        "Authorization": f"Bearer {settings.medium_integration_token}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    try:
        with httpx.Client(timeout=60.0) as client:
            me = client.get(ME_USER_URL, headers=headers)
            if me.status_code >= 400:
                return PublishResult(
                    platform="medium",
                    success=False,
                    message=f"Medium /me failed: {me.status_code} {me.text[:300]}",
                )
            user = me.json().get("data") or {}
            user_id = user.get("id") or settings.medium_publication_id
            if not user_id:
                return PublishResult(
                    platform="medium",
                    success=False,
                    message="Could not resolve Medium user id",
                )

            title, subtitle, md = _parse_medium_fields(draft.body)
            html = _simple_md_to_html(md)
            if subtitle:
                html = f"<p><strong>{subtitle}</strong></p>" + html

            post_url = ME_POST_TMPL.format(user_id=user_id)
            payload = {
                "title": title,
                "contentFormat": "html",
                "content": html,
                "publishStatus": "draft",
                "license": "all-rights-reserved",
            }
            r = client.post(post_url, headers=headers, json=payload)
            if r.status_code >= 400:
                return PublishResult(
                    platform="medium",
                    success=False,
                    message=f"HTTP {r.status_code}: {r.text[:500]}",
                )
            data = r.json().get("data") or {}
            return PublishResult(
                platform="medium",
                success=True,
                external_id=str(data.get("id") or uuid.uuid4()),
                raw=data,
            )
    except Exception as e:
        log.exception("Medium publish failed")
        return PublishResult(platform="medium", success=False, message=str(e))
