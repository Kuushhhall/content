from app.models.article import NormalizedArticle
from app.llm.prompts.persona import LAWXY_REPORTER_PERSONA, STRUCTURE_RULES


def build_framer_prompt(article: NormalizedArticle, summary: str) -> str:
    return f"""{LAWXY_REPORTER_PERSONA}

{STRUCTURE_RULES}

Task:
Create a CMS-ready legal news article.

Output STRICTLY as JSON with keys: title (string), slug_slug (kebab-case string), excerpt (string, 1-2 sentences), body_md (markdown string for rich text).

Rules:
- Length: 300-400 words in body_md
- Tight writing, no filler
- Include source link once (naturally embedded)
- End with: "By Lawxy Times Reporter"

Article title: {article.title}
Source: {article.source}
URL: {article.url}

Summary:
{summary}"""