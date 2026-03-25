from app.models.article import NormalizedArticle
from app.llm.prompts.persona import LAWXY_REPORTER_PERSONA, STRUCTURE_RULES


def build_linkedin_prompt(article: NormalizedArticle, summary: str) -> str:
    return f"""{LAWXY_REPORTER_PERSONA}

{STRUCTURE_RULES}

Task:
Write a LinkedIn post reacting to this legal development.

Rules:
- LinkedIn does NOT render markdown. Do not use ** or # headers.
- For emphasis, use Unicode mathematical bold letters for 3-5 key phrases only (e.g. copy paste style: 𝗖𝗼𝘂𝗿𝘁, 𝗦𝗖𝗖 — use Unicode bold sans for Latin letters where you want emphasis).
- Strong opening line (scroll-stopping, sharp)
- Short paragraphs (1-3 lines)
- Focus on insight, not summary repetition
- Max ~1200-1800 characters
- Add ONE relevant hashtag at the end
- End with a sharp or slightly witty closing line
- Mention the court/tribunal if known.

Avoid:
Corporate tone
Over-explaining
Generic "key takeaway" phrasing

Article title: {article.title}
Source: {article.source}
URL: {article.url}

Summary:
{summary}

Write only the post body."""


def post_process_linkedin(body: str) -> str:
    # Strip accidental markdown hashes at line start
    lines = []
    for line in body.splitlines():
        s = line.strip()
        if s.startswith("#"):
            s = s.lstrip("#").strip()
        lines.append(s)
    text = "\n\n".join(lines)
    return text.strip()[:3000]