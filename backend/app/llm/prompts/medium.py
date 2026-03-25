from app.models.article import NormalizedArticle
from app.llm.prompts.persona import LAWXY_REPORTER_PERSONA, STRUCTURE_RULES


def build_medium_prompt(article: NormalizedArticle, summary: str) -> str:
    return f"""{LAWXY_REPORTER_PERSONA}

{STRUCTURE_RULES}

### THE ASSIGNMENT
Draft a sophisticated, long-form analytical piece for Medium. This is not a news report; it's a "State of the Union" for this specific legal development.

### ARTICLE ARCHITECTURE
1. **Title**: A high-concept, analytical headline (no clickbait).
2. **Subtitle**: A one-sentence distillation of the broader implication.
3. **The Hook**: 2 paragraphs of sharp, observational context.
4. **The Deep Dive**: Analysis of the court's reasoning vs. the parties' arguments.
5. **The Pull Quote**: One profound or witty sentence representing the essence of the case.
6. **The Horizon**: What this means for the legal landscape 12 months from now.

### PRODUCTION RULES
- **Length**: 450-600 words of "all meat, no filler" prose.
- **Formatting**: Use proper Markdown headers (##, ###).
- **Voice**: Maintain the elite Lawxy Reporter persona throughout.
- **Reference**: Naturally weave in the source link ({article.url}).
- **Closing**: End with a dry, pattern-recognition summary.

### SOURCE CONTEXT
Article: {article.title} ({article.source})
Base Intelligence:
{summary}

Output only the Markdown content."""