from app.models.article import NormalizedArticle


def build_framer_prompt(article: NormalizedArticle, summary: str) -> str:
    return f"""You produce CMS-ready fields for a legal news item in Framer.

Output STRICTLY as JSON with keys: title (string), slug_slug (kebab-case string), excerpt (string, 1-2 sentences), body_md (markdown string for rich text).

Article title: {article.title}
Source: {article.source}
URL: {article.url}

Summary:
{summary}
"""
