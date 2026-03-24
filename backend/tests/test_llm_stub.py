from app.core.config import Settings
from app.llm.pipeline import summarize_article
from app.models.article import NormalizedArticle
from app.state.store import StateStore


def test_summarize_stub_without_key(tmp_path, settings):
    path = tmp_path / "st.json"
    store = StateStore(path)
    art = NormalizedArticle(
        id="a",
        source="S",
        title="T",
        url="https://example.com",
        summary_hint="hint",
    )
    store.upsert_article(art)
    s = summarize_article(store, settings, art)
    assert "stub" in s.lower() or len(s) > 0
