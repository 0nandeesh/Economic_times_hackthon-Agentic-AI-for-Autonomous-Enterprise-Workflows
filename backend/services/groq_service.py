from typing import Optional


class GroqService:
    """
    Minimal placeholder for Groq integration.
    For hackathon: keep this thin so agents can swap between heuristic parsing and LLM calls.
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key

    def is_configured(self) -> bool:
        return bool(self.api_key)

    def chat(self, prompt: str) -> str:
        """
        Replace this with real Groq API call when you add the groq client dependency.
        """
        raise NotImplementedError("Groq API not wired yet. Set GROQ_API_KEY and implement GroqService.chat().")

