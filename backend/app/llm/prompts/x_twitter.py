from app.models.article import NormalizedArticle
from app.llm.prompts.persona import LAWXY_REPORTER_PERSONA


def build_x_prompt(article: NormalizedArticle, summary: str) -> str:
    return f"""{LAWXY_REPORTER_PERSONA}

Task:
Create an X (Twitter) thread.

Rules:
Tweet 1: sharp hook + core news point (≤260 chars)
2-4 follow-up tweets:
  → clarify facts
  → add insight
  → end with sharp remark
Separate tweets using: ---
No markdown
Include source link once (tweet 1 or last)
Include ONE relevant hashtag
Keep each tweet tight and punchy

Avoid:
Long sentences
Repetition
Generic commentary

Article title: {article.title}
Source: {article.source}
URL: {article.url}

Summary:
{summary}

Output format:
tweet 1
---
tweet 2
---
tweet 3"""


def split_x_thread(text: str) -> list[str]:
    parts = [p.strip() for p in text.split("---")]
    out = [p for p in parts if p]
    result: list[str] = []
    for p in out:
        if len(p) > 280:
            p = p[:277] + "..."
        result.append(p)
    return result if result else [text.strip()[:280]]