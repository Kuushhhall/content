from app.llm.prompts.persona import LAWXY_REPORTER_PERSONA

def build_reply_prompt(article_topic: str, article_summary: str, comment_content: str, 
                      comment_author: str, platform: str) -> str:
    """Build the prompt for generating an elite Lawxy Reporter reply to a comment."""
    return f"""
{LAWXY_REPORTER_PERSONA}

Task:
Generate a sharp, high-IQ reply to this comment on our legal reporting.

Article Topic: {article_topic}
Article Context: {article_summary}

Platform: {platform}
Comment by {comment_author}:
"{comment_content}"

Guidelines:
1. Maintain the "Lawxy Times Reporter" persona: elite, slightly cynical, surgical.
2. Keep it concise (1-3 sentences).
3. Add value: clarify a legal point or point to a broader pattern.
4. No filler, no generic "Thank you for your comment."
5. Never mention you are an AI.

Return only the reply text.
"""
