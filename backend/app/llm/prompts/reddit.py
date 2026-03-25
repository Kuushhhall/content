from app.models.article import NormalizedArticle
from app.llm.prompts.persona import LAWXY_REPORTER_PERSONA, STRUCTURE_RULES


def build_reddit_prompt(article: NormalizedArticle, summary: str) -> str:
    return f"""{LAWXY_REPORTER_PERSONA}

{STRUCTURE_RULES}

### THE SUBREDDIT ASSIGNMENT
You are posting to a high-signal legal community (e.g., r/law, r/legaladviceofftopic). They value precision over passion.

### REDDIT STYLE GUIDE
1. **The Title**: Must be an analytical summary, not a headline. (e.g., "The SCC's ruling on [X] just created a paradox for [Y]").
2. **The TL;DR**: 2-3 sentences at the top summarizing the 'why'.
3. **The Analysis**: Break down the most controversial or non-obvious part of the judgment.
4. **The Discussion Starter**: End with a sharp, professional question or a pattern observation that invites high-level debate.

### PRODUCTION RULES
- **Tone**: Smart, slightly cynical, insider-voice.
- **Formatting**: Use Markdown for lists or key bold terms.
- **Source**: Always include the link ({article.url}).
- **Closing**: A dry, surgical parting shot.

### SOURCE CONTEXT
Article: {article.title}
Base Intelligence:
{summary}

Format:
TITLE: [Your Case-Analytical Title]
[Rest of the post body]"""


def parse_reddit_title_body(generated: str) -> tuple[str, str]:
    lines = generated.strip().splitlines()
    title = "Legal update"
    if lines and lines[0].upper().startswith("TITLE:"):
        title = lines[0].split(":", 1)[1].strip() or title
        lines = lines[1:]
    # skip leading blanks
    while lines and not lines[0].strip():
        lines = lines[1:]
    body = "\n".join(lines).strip()
    return title[:300], body