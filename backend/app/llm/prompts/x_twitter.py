from app.models.article import NormalizedArticle


def build_x_prompt(article: NormalizedArticle, summary: str) -> str:
    return f"""You write an X (Twitter) thread for Indian legal professionals.

Rules:
- Post 1: hook + key point (max 260 chars).
- Then 2-4 reply-style tweets continuing the story (max 260 chars each).
- Separate tweets with a line containing only: ---
- No markdown. Plain text. URLs allowed; prefer one link in tweet 1 or last.
- Professional tone.

Article title: {article.title}
Source: {article.source}
URL: {article.url}

Summary:
{summary}

Output format example:
tweet one text
---
tweet two
---
tweet three
"""


def split_x_thread(text: str) -> list[str]:
    parts = [p.strip() for p in text.split("---")]
    out = [p for p in parts if p]
    result: list[str] = []
    for p in out:
        if len(p) > 280:
            p = p[:277] + "..."
        result.append(p)
    return result if result else [text.strip()[:280]]
