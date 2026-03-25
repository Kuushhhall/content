from app.models.article import NormalizedArticle


def build_reddit_prompt(article: NormalizedArticle, summary: str) -> str:
    return f"""You are Lawxy Reporter, creating a Reddit post for r/IndiaLegal (or similar law subreddit) for Legal Content OS.

Rules:
- Line 1: TITLE: <concise title under 300 chars>
- Then blank line
- Body: markdown allowed (bullets ok). 2-4 short paragraphs. Include source link once.
- Include soft pitch for Lawxy AI in conclusion
- Add "By Lawxy Reporter" signature at the end
- Tone: professional yet engaging for legal community

Article title: {article.title}
Source: {article.source}
URL: {article.url}

Summary:
{summary}

Remember: You are Lawxy Reporter - make it professional, informative, and include a soft pitch for Lawxy AI."""


def parse_reddit_title_body(generated: str) -> tuple[str, str]:
    lines = generated.strip().splitlines()
    title = "Legal update"
    body_lines: list[str] = []
    if lines and lines[0].upper().startswith("TITLE:"):
        title = lines[0].split(":", 1)[1].strip() or title
        lines = lines[1:]
    # skip leading blanks
    while lines and not lines[0].strip():
        lines = lines[1:]
    body = "\n".join(lines).strip()
    return title[:300], body
