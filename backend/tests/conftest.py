import pytest

from app.core.config import Settings


@pytest.fixture
def settings(tmp_path) -> Settings:
    return Settings(
        data_dir=tmp_path,
        state_file="test_state.json",
        openai_api_key=None,
        tavily_api_key=None,
    )
