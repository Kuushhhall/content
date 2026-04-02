import json
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parent.parent.parent / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Legal Content OS API"
    debug: bool = False

    data_dir: Path = Path(__file__).resolve().parent.parent.parent / "data"
    state_file: str = "state.json"

    # LLM (OpenAI-compatible: works with OpenAI, Groq, Azure, etc.)
    openai_api_key: str | None = None
    openai_base_url: str | None = None
    llm_model: str = "llama-3.3-70b-versatile"

    # Tavily (SCC / web search)
    tavily_api_key: str | None = None


    # Publishers — LinkedIn (copy-paste only, no API posting)
    linkedin_access_token: str | None = None
    linkedin_person_urn: str | None = None
    linkedin_organization_id: str | None = None

    # X (Twitter) (copy-paste only, no API posting)
    twitter_api_key: str | None = None
    twitter_api_secret: str | None = None
    twitter_access_token: str | None = None
    twitter_access_token_secret: str | None = None

    # Framer CMS
    framer_api_token: str | None = None
    framer_project_id: str | None = None
    framer_collection_id: str | None = None
    framer_collection_type: str = "news"

    framer_field_title: str = "GlEJCucUC"
    framer_field_excerpt: str = "H76FV4UEM"
    framer_field_body_snippet: str = "fFgoO6cYg"
    framer_field_content: str = "A11mmr7Ra"
    framer_field_featured: str = "Fztf8IFX3"
    framer_field_author: str = "YDHS8MCIi"
    framer_field_category: str = "EVAt7zfnx"
    framer_field_image: str = "YcCvnPRvd"

    framer_default_author: str = "vNngYbHGC"

    framer_category_map: dict = {
        "Litigation": "zy7z6HZkN",
        "AI in Legal": "qG9elqDnx",
        "Legal Tech & AI": "qG9elqDnx",
        "Regulatory": "ir0iYnWyh",
        "Legal Guides": "XjoT7kcK7",
        "Judgements & Cases": "zy7z6HZkN",
        "Disputes & Enforcement": "NgjBjS5IB",
        "Compliance & Risk": "j2EW2fFYJ",
        "Commercial & Transactions": "zKiSwVkZk",
        "Legal Updates": "O2Ry36OcG",
        "news": "O2Ry36OcG",
    }

    @property
    def state_path(self) -> Path:
        self.data_dir.mkdir(parents=True, exist_ok=True)
        return self.data_dir / self.state_file


@lru_cache
def get_settings() -> Settings:
    return Settings()
