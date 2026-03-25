from app.llm.prompts.persona import LAWXY_REPORTER_PERSONA, STRUCTURE_RULES

def build_structured_summary_prompt(article_title: str, article_content: str) -> str:
    """Build the prompt for generating an elite Lawxy Reporter structured summary."""
    return f"""
{LAWXY_REPORTER_PERSONA}

{STRUCTURE_RULES}

Task:
Generate a structured intelligence summary for this legal article:

Title: {article_title}
Content: {article_content[:2000]}

Provide a concise summary (3-4 sentences) that covers the core legal issue, the decision, the significance, and the affected demographic.

Return only the summary text.
"""

def build_metadata_intelligence_prompt(article_title: str, article_summary: str, article_content: str) -> str:
    """Build the prompt for extracting structured legal intelligence metadata using the Lawxy persona."""
    return f"""
{LAWXY_REPORTER_PERSONA}

Task:
Analyze this legal article as a precision analyst and provide structured metadata.

Title: {article_title}
Summary Context: {article_summary}
Content Extract: {article_content[:3000]}

Provide the following structured information in JSON format:
1. Topic (1-3 words)
2. Legal Area
3. Audience
4. Angle
5. Complexity Level (beginner/intermediate/expert)
6. Virality Score (0.0 to 1.0)
7. Relevance Score (0.0 to 1.0)
8. Key Insights (3-5 bullet points)
9. Affected Parties
10. Legal Implications
11. Suggested Hashtags (3-5)

Output STRICTLY valid JSON object. No conversational filler.
"""
