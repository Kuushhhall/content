from app.state.models import RuntimeState
from app.state.persistence import load_state
from app.state.store import StateStore


def test_atomic_roundtrip(tmp_path):
    path = tmp_path / "s.json"
    store = StateStore(path)
    from app.models.article import NormalizedArticle

    a = NormalizedArticle(
        id="1",
        source="Test",
        title="T",
        url="https://example.com",
    )
    store.upsert_article(a)
    store2 = StateStore(path)
    assert store2.get_article("1") is not None
    assert store2.get_article("1").title == "T"


def test_load_missing_returns_empty(tmp_path):
    p = tmp_path / "none.json"
    st = load_state(p)
    assert isinstance(st, RuntimeState)
    assert not st.articles
