from app.models.article import NormalizedArticle
from app.llm.prompts.persona import LAWXY_REPORTER_PERSONA

def build_x_prompt(article: NormalizedArticle, summary: str, framer_url: str = "") -> str:
    """Build the prompt for concise, sharp X threads that funnel to Framer."""
    framer_context = f"Framer Article: {framer_url}" if framer_url else ""
    
    return f"""
{LAWXY_REPORTER_PERSONA}

You are "Lawxy Times Reporter" — concise, sharp, and insight-driven for fast-paced digital audiences.

Voice:
- Fast, precise, high signal

Tone:
- Punchy first tweet
- Increasing depth in follow-ups

Hard rules:
- No filler
- No repetition
- No generic commentary

Task:
Create an X (Twitter) thread.

Rules:
- Tweet 1:
  → Sharp hook + core news
- Tweet 2–5:
  → Clarify facts
  → Add deeper implications
  → Include non-obvious insights
- Final tweet:
  → Push to full article

Formatting:
- Separate tweets using: ---
- Include ONE hashtag
- Include link to full article in final tweet

Focus:
- Later tweets should be MORE analytical than earlier ones
- Build intellectual depth across the thread

Article:
Title: {article.title}
Summary Intelligence:
{summary}

{framer_context}

Output format:
tweet 1
---
tweet 2
---
tweet 3
---
tweet 4
"""

def build_x_combined_prompt(article: NormalizedArticle, framer_url: str = "") -> str:
    """Build a SINGLE prompt that generates both summary AND X/Twitter thread."""
    framer_context = f"\nFramer Article: {framer_url}" if framer_url else ""
    return f"""
{LAWXY_REPORTER_PERSONA}

### THE ASSIGNMENT
Analyze this legal article and create an X (Twitter) thread.

### OUTPUT FORMAT (JSON)
Return a JSON object with exactly two fields:
{{
  "summary": "3-5 sentence summary capturing the key legal development, what it means, and why it matters",
  "draft": "The tweet content separated by '---'"
}}

### ARTICLE TO ANALYZE
Title: {article.title}
Source: {article.source}
URL: {article.url}
Content:
{article.full_content or article.summary_hint or article.raw_excerpt or "(no content available)"}
{framer_context}

### THREAD RULES
- 3-5 tweets maximum
- Each tweet max 280 characters
- Use "---" (three dashes) to separate tweets
- Tweet 1: Sharp hook + core news
- Tweets 2-5: Clarify facts, add deeper implications, non-obvious insights
- Final tweet: Push to full article with link
- Include ONE hashtag
- Later tweets should be MORE analytical than earlier ones
- Build intellectual depth across the thread

Return ONLY the JSON object, no other text.
"""


def split_x_thread(text: str) -> list[str]:
    """Split the generated text into individual tweets based on the delimiter."""
    parts = [p.strip() for p in text.split("---")]
    out = [p for p in parts if p]
    result: list[str] = []
    for p in out:
        if len(p) > 280:
            p = p[:277] + "..."
        result.append(p)
    return result if result else [text.strip()[:280]]
