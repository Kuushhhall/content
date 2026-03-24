from app.sources.rss import _entry_id


def test_entry_id_stable():
    a = _entry_id("http://f", "http://u", "t")
    b = _entry_id("http://f", "http://u", "t")
    assert a == b
    assert len(a) == 32
