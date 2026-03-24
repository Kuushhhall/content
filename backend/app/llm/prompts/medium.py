from app.models.article import NormalizedArticle


def build_medium_prompt(article: NormalizedArticle, summary: str) -> str:
    return f"""You write a Medium-ready article (Integration API expects HTML body in our pipeline — output structured sections we convert).

Output:
TITLE: ...
SUBTITLE: ...
BODY_MARKDOWN: ...
(use --- between SUBTITLE and BODY if needed; BODY_MARKDOWN is full story in markdown)

Article title: {article.title}
Source: {article.source}
URL: {article.url}

Summary:
{summary}
"""
