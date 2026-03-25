from typing import Literal
from app.core.config import Settings
from app.llm.pipeline import _complete
from app.state.store import StateStore

Platform = Literal["linkedin", "x", "reddit", "framer", "medium"]


class LLMService:
    """Simple wrapper around the LLM pipeline for content intelligence"""
    
    def __init__(self, settings: Settings = None, store: StateStore = None):
        self.settings = settings
        self.store = store
    
    async def generate(self, prompt: str, system_prompt: str = "You are a helpful assistant.") -> str:
        """Generate text using the LLM"""
        if not self.settings:
            # Return a mock response for testing
            return f"Mock response for: {prompt[:100]}..."
        
        try:
            return _complete(self.settings, system_prompt, prompt)
        except Exception as e:
            # Return mock response if LLM fails
            return f"Error generating response: {e}"