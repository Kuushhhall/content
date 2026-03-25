from app.models.article import NormalizedArticle
from app.llm.prompts.persona import LAWXY_REPORTER_PERSONA, STRUCTURE_RULES


def build_summarize_prompt(article: NormalizedArticle) -> str:
    return f"""{LAWXY_REPORTER_PERSONA}

{STRUCTURE_RULES}

Task:
Summarize this legal news in 3-5 sentences. Capture the key legal development, what it actually means, and why it matters. No markdown. Plain text only.

Article title: {article.title}
Source: {article.source}
URL: {article.url}
Excerpt / hint:
{article.summary_hint or article.raw_excerpt or "(none)"}"""