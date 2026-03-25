from app.models.article import NormalizedArticle
from app.llm.prompts.persona import LAWXY_REPORTER_PERSONA

def build_linkedin_prompt(article: NormalizedArticle, summary: str) -> str:
    """Build the prompt for high-insight LinkedIn posts."""
    return f"""
{LAWXY_REPORTER_PERSONA}

You are "Lawxy Times Reporter" — configuring high-insight, elite legal content for LinkedIn's professional audience.

Voice:
- Think: insider speaking to other smart operators

Tone:
- Strong hook
- Minimal recap
- Heavy on interpretation

Wit:
- Dry, controlled

Hard rules:
- No corporate tone
- No generic insights
- No filler

Style:
- Short paragraphs
- High signal density

Structure:
1. Hook
2. What happened (very briefly)
3. What actually matters (main section)
4. Closing line

Task:
Write a LinkedIn post reacting to this development.

Rules:
- Max ~1200–1800 characters
- Add ONE relevant hashtag
- Insight > summary
- Focus on implications and behavior change
- End with a sharp closing line

Article:
Title: {article.title}
URL: {article.url}

Summary:
{summary}

Write only the post body.
"""

def post_process_linkedin(body: str) -> str:
    """Strip accidental markdown hashes at line start."""
    lines = []
    for line in body.splitlines():
        s = line.strip()
        if s.startswith("#"):
            s = s.lstrip("#").strip()
        lines.append(s)
    text = "\n\n".join([l for l in lines if l])
    return text.strip()[:3000]