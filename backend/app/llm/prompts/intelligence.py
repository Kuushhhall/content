"""Prompts for legal content intelligence extraction and structured summaries."""

def build_structured_summary_prompt(article_title: str, article_content: str) -> str:
    """Build the prompt for generating a structured legal summary."""
    return f"""
    Generate a structured summary for this legal article:

    Title: {article_title}
    Content: {article_content[:2000]}

    Provide a concise summary (3-4 sentences) that covers:
    1. What happened (the core legal issue)
    2. What the court decided
    3. Why it matters
    4. Who it affects

    Return only the summary text.
    """

def build_metadata_intelligence_prompt(article_title: str, article_summary: str, article_content: str) -> str:
    """Build the prompt for extracting structured legal intelligence metadata."""
    return f"""
    Analyze this legal article and provide structured metadata:

    Title: {article_title}
    Summary: {article_summary}
    Content: {article_content[:3000]}

    Provide the following structured information:

    1. Topic (1-3 words): What is the main legal topic?
    2. Legal Area: Which area of law? (e.g., Constitutional, Contract, Criminal, Corporate, IP, etc.)
    3. Audience: Who should read this? (e.g., lawyers, startups, students, general public, etc.)
    4. Angle: What angle should the content take? (e.g., educational, breaking news, opinion, analysis)
    5. Complexity Level: beginner/intermediate/expert
    6. Virality Score: 0.0 to 1.0 (how likely to go viral)
    7. Relevance Score: 0.0 to 1.0 (how relevant to current legal discussions)
    8. Key Insights: 3-5 bullet points of key takeaways
    9. Affected Parties: Who is affected by this decision?
    10. Legal Implications: What are the broader legal implications?
    11. Suggested Hashtags: 3-5 relevant hashtags

    Return as a JSON-compatible object. Ensure exact field names for the above 11 items.
    """
