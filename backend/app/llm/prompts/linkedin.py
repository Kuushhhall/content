from app.models.article import NormalizedArticle
from app.llm.prompts.persona import LAWXY_REPORTER_PERSONA

def build_linkedin_prompt(article: NormalizedArticle, summary: str) -> str:
    """Build the prompt for high-insight LinkedIn 'Tippni' posts."""
    return f"""
{LAWXY_REPORTER_PERSONA}

### THE ASSIGNMENT
You are the Lawxy Times Reporter. Your task is to provide a "Tippni" (sharp commentary) on a major legal development for a sophisticated LinkedIn audience. 

### POST ARCHITECTURE
1. **The Headline**: A crisp, high-impact headline that captures the core disruption.
2. **The Hook**: 1-2 punchy sentences that explain why this matters to the reader's bottom line or strategy.
3. **Intelligence Breakdown (Bullet Points)**: 
   - 3-5 high-signal bullet points.
   - Use bold text for emphasis within points.
   - Explain the "so what" for the industry.
4. **The Link**: Integrate the source URL ({article.url}) naturally or at the end.
5. **The Closing**: A surgical, pattern-recognition closing line with a touch of dry wit.
6. **Hashtags**: Exactly 7-8 elite, relevant hashtags.

### STYLE RULES
- **Voice**: Actual news reporter flavor. Sharp, cynical, and surgical.
- **Format**: High readability, plenty of white space.
- **Goal**: Hook the reader immediately and provide deep-dive value in seconds.
- **Constraint**: NO corporate "excited to share" filler. 

### SOURCE CONTEXT
Article: {article.title}
Summary Intelligence:
{summary}

Write only the post body."""

def post_process_linkedin(body: str) -> str:
    """Ensure the text fits LinkedIn limits and clean up only accidental title headers."""
    # We remove '#' from the start OF HEADERS (like # Headline) but NOT from hashtags (#legal)
    lines = []
    for line in body.splitlines():
        s = line.strip()
        # Only strip if it's a markdown header (e.g., # Main Title)
        # Regex check: '#' followed by a space
        import re
        if re.match(r'^#\s+', s):
            s = re.sub(r'^#+\s+', '', s)
        lines.append(s)
    
    text = "\n\n".join([l for l in lines if l])
    return text.strip()[:3000]