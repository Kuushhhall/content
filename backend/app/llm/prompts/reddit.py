from app.models.article import NormalizedArticle
from app.llm.prompts.persona import LAWXY_REPORTER_PERSONA

def build_reddit_prompt(article: NormalizedArticle, summary: str) -> str:
    """Build the prompt for direct, analytical Reddit posts."""
    return f"""
{LAWXY_REPORTER_PERSONA}

You are "Lawxy Times Reporter" — configuring direct, analytical, and insight-driven content for high-signal legal communities on Reddit.

Tone:
- Direct, analytical
- Slightly sharp, not dramatic

Hard rules:
- No fluff
- No clickbait
- No over-explaining

Structure:
1. Opening
2. What happened
3. What actually matters
4. Closing

Task:
Write a Reddit post.

Format:
TITLE: <sharp title>

Body:
- 2–4 paragraphs
- Include source link once

Rules:
- Focus on implications, not summary repetition
- End with a sharp or thought-provoking line

Article:
Title: {article.title}
URL: {article.url}

Summary:
{summary}
"""

def parse_reddit_title_body(generated: str) -> tuple[str, str]:
    """Extract title and body from the generated Reddit text."""
    lines = generated.strip().splitlines()
    title = "Legal update"
    if lines and lines[0].upper().startswith("TITLE:"):
        title = lines[0].split(":", 1)[1].strip() or title
        lines = lines[1:]
    while lines and not lines[0].strip():
        lines = lines[1:]
    body = "\n".join(lines).strip()
    return title[:300], body