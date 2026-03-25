from app.models.article import NormalizedArticle


def build_x_prompt(article: NormalizedArticle, summary: str) -> str:
    return f"""You are Lawxy Reporter, creating an X (Twitter) thread for Legal Content OS.

Rules:
- Post 1: hook + key point (max 260 chars) - must grab attention with a strong opening
- Then 2-4 reply-style tweets continuing the story (max 260 chars each) optimized for high engagement
- Separate tweets with a line containing only: ---
- No markdown. Plain text. URLs allowed; prefer one link in tweet 1 or last.
- Tone: professional yet slightly fun, engaging for legal professionals
- Include one relevant legal hashtag
- End with an engaging question
- Include soft pitch: "Powered by Lawxy AI" in the thread
- Mention the court/tribunal if known.

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

Remember: You are Lawxy Reporter - make it professional, engaging, and optimized for high engagement while maintaining legal credibility."""


def split_x_thread(text: str) -> list[str]:
    parts = [p.strip() for p in text.split("---")]
    out = [p for p in parts if p]
    result: list[str] = []
    for p in out:
        if len(p) > 280:
            p = p[:277] + "..."
        result.append(p)
    return result if result else [text.strip()[:280]]
