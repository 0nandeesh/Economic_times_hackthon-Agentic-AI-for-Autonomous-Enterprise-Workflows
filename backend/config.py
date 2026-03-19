from __future__ import annotations

import os

from dotenv import load_dotenv
from pydantic import BaseModel


# Load environment variables from .env at startup
load_dotenv()


class Settings(BaseModel):
    groq_api_key: str | None = os.getenv("GROQ_API_KEY")
    app_title: str = "AutoFlow AI — Autonomous Enterprise Workflow Engine"
    cors_allow_origins: list[str] = ["*"]


settings = Settings()

