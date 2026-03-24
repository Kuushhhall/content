from app.models.article import NormalizedArticle


def build_summarize_prompt(article: NormalizedArticle) -> str:
    return f"""You are a legal editor summarizing Indian legal news for busy lawyers.

Article title: {article.title}
Source: {article.source}
URL: {article.url}
Excerpt / hint:
{article.summary_hint or article.raw_excerpt or "(none)"}

Produce a concise neutral summary (3-5 sentences). No markdown. Plain text only.
"""
