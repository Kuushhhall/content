"""Prompts for comment engagement and AI replies."""

def build_reply_prompt(article_topic: str, article_summary: str, comment_content: str, 
                      comment_author: str, platform: str) -> str:
    """Build the prompt for generating an AI reply to a comment."""
    return f"""
    Generate a helpful, human-like reply to this comment on a legal article:

    Article Topic: {article_topic}
    Article Summary: {article_summary}
    
    Comment: {comment_content}
    
    Author: {comment_author}
    Platform: {platform}
    
    Guidelines:
    1. Be helpful and informative
    2. Keep it concise (2-3 sentences)
    3. Add value to the conversation
    4. Slightly conversational but professional
    5. Do not mention AI or automation
    6. If appropriate, suggest checking the full article for more details
    
    Return only the reply text.
    """
