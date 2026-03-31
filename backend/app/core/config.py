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


    # Scheduler - DISABLED
    # ingest_cron_minutes: int = 30
    # publish_scan_interval_seconds: int = 60

    # Publishers — LinkedIn (OAuth2 three-legged in production; token when pre-authorized)
    linkedin_access_token: str | None = None
    linkedin_person_urn: str | None = None  # urn:li:person:...
    linkedin_organization_id: str | None = None  # For company page posting

    # X (Twitter) OAuth 1.0a
    twitter_api_key: str | None = None
    twitter_api_secret: str | None = None
    twitter_access_token: str | None = None
    twitter_access_token_secret: str | None = None

    # Reddit
    reddit_client_id: str | None = None
    reddit_client_secret: str | None = None
    reddit_user_agent: str = "legal-content-os/0.1 by developer"
    reddit_username: str | None = None
    reddit_password: str | None = None
    reddit_subreddit: str = "test"

    # Framer CMS
    framer_api_token: str | None = None
    framer_project_id: str | None = None
    framer_collection_id: str | None = None
    framer_collection_type: str = "articles"  # "articles" or "news"

    # Framer News collection field IDs (yB98Z953G — confirmed from live items)
    framer_field_title: str = "GlEJCucUC"       # Heading (string)
    framer_field_excerpt: str = "H76FV4UEM"     # SubHeading (string)
    framer_field_body_snippet: str = "fFgoO6cYg" # Body snippet/description (string)
    framer_field_content: str = "A11mmr7Ra"     # Content (formattedText)
    framer_field_featured: str = "Fztf8IFX3"   # Featured (boolean)
    framer_field_author: str = "YDHS8MCIi"     # Author (collectionReference)
    framer_field_category: str = "EVAt7zfnx"   # News Category (collectionReference)
    framer_field_image: str = "YcCvnPRvd"      # Image (image)

    # Framer default author item ID (collectionReference — must be item ID, not slug)
    # krunal-shah item ID in knauXjZXG Authors collection
    framer_default_author: str = "vNngYbHGC"

    # Framer News Category mapping (maps category names → item IDs in ep2lxPZjA collection)
    # Values are item IDs (not slugs) because EVAt7zfnx is a collectionReference field
    # Can be set via FRAMER_CATEGORY_MAP env var as JSON string
    framer_category_map: dict = {
        # ep2lxPZjA News Category collection — real item IDs
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
        "Product & Company Update": "ir0iYnWyh",
        "Types of Contracts": "zKiSwVkZk",
        "Due Diligence": "j2EW2fFYJ",
        # Aliases for LLM slug-style names
        "ai-in-legal": "qG9elqDnx",
        "legal-tech-ai": "qG9elqDnx",
        "legal-update": "O2Ry36OcG",
        "news": "O2Ry36OcG",
        "judgements-cases": "zy7z6HZkN",
        "disputes-enforcement": "NgjBjS5IB",
        "regulatory": "ir0iYnWyh",
    }
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Parse FRAMER_CATEGORY_MAP from JSON string if provided
        if isinstance(self.framer_category_map, str):
            try:
                self.framer_category_map = json.loads(self.framer_category_map)
            except json.JSONDecodeError:
                # Keep default if JSON parsing fails
                pass

    # Medium Integration API
    medium_integration_token: str | None = None
    medium_publication_id: str | None = None

    @property
    def state_path(self) -> Path:
        self.data_dir.mkdir(parents=True, exist_ok=True)
        return self.data_dir / self.state_file


@lru_cache
def get_settings() -> Settings:
    return Settings()
