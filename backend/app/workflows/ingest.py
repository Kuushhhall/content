import logging

from app.core.config import Settings
from app.sources import rss as rss_sources
from app.sources import tavily_client
from app.state.store import StateStore

log = logging.getLogger(__name__)


def run_ingestion(store: StateStore, settings: Settings) -> int:
    """Fetch RSS + Tavily and upsert articles. Returns count of new/updated articles."""
    count = 0
    articles = rss_sources.ingest_all_rss(settings)
    articles.extend(tavily_client.search_scc_legal_news(settings))
    for article in articles:
        existing = store.get_article(article.id)
        if existing is None or existing.title != article.title or existing.url != article.url:
            store.upsert_article(article)
            count += 1
        elif existing.summary_hint != article.summary_hint:
            store.upsert_article(article)
            count += 1
    log.info("Ingestion upserted %s articles", count)
    return count
