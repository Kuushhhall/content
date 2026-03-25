from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
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

    # RSS feed URLs (override per env if feeds move)
    rss_livelaw: str = "https://www.livelaw.in/rss"
    rss_barandbench: str = "https://www.barandbench.com/feed"
    rss_indialegal: str = "https://indialegallive.com/feed/"
    rss_supreme_court: str = "https://main.sci.gov.in/rss/latest-feed"
    rss_high_courts: str = "https://www.indiankanoon.org/rss/"

    # Scheduler
    ingest_cron_minutes: int = 30
    publish_scan_interval_seconds: int = 60

    # Publishers — LinkedIn (OAuth2 three-legged in production; token when pre-authorized)
    linkedin_access_token: str | None = None
    linkedin_person_urn: str | None = None  # urn:li:person:...

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
    framer_field_title: str = "J9QaRrBR5"
    framer_field_excerpt: str = "CuiJCY8aB"
    framer_field_content: str = "SZLKAQXiQ"
    framer_base_url: str = "https://lawxy-times.framer.website"

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
