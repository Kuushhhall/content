from typing import Literal
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from app.core.config import Settings
from app.llm.pipeline import _complete
from app.state.store import StateStore

from app.llm.prompts.system_prompts import EDITOR_SYSTEM_PROMPT

Platform = Literal["linkedin", "x", "reddit", "framer", "medium"]


class LLMService:
    """Simple wrapper around the LLM pipeline for content intelligence"""
    
    def __init__(self, settings: Settings = None, store: StateStore = None):
        self.settings = settings
        self.store = store
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10),
        retry=retry_if_exception_type(Exception)
    )
    async def generate(self, prompt: str, system_prompt: str = EDITOR_SYSTEM_PROMPT) -> str:
        """Generate text using the LLM with retry logic"""
        if not self.settings:
            # Return a mock response for testing
            return f"Mock response for: {prompt[:100]}..."
        
        try:
            return _complete(self.settings, system_prompt, prompt)
        except Exception as e:
            # Return mock response if LLM fails
            return f"Error generating response: {e}"
