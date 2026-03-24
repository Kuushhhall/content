# Legal Content OS

Backend-first **Legal Content OS**: FastAPI service that ingests Indian legal news (RSS + optional Tavily), generates per-platform copy with an LLM, and publishes to LinkedIn, X, Reddit, Framer, and Medium.

## Backend quick start

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env
# set at least OPENAI_API_KEY for real generations
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- API base: `http://localhost:8000/api`
- Health: `GET /api/health`
- State is kept **in memory** and persisted to `DATA_DIR/state.json` (default `./data/state.json`) on every write.

## Main API flows

| Action | Method | Path |
|--------|--------|------|
| List articles | GET | `/api/articles` |
| Trigger ingest | POST | `/api/articles/ingest` |
| Generate draft | POST | `/api/drafts/generate` |
| Update draft body | PATCH | `/api/drafts/{id}` |
| Publish now | POST | `/api/publish/now` |
| Schedule post | POST | `/api/schedule` |
| List schedules | GET | `/api/schedule` |
| Publish results | GET | `/api/publish/results` |

## Architecture notes

- **No Celery / Redis** — `APScheduler` runs periodic ingest and scans due scheduled posts in-process.
- **LinkedIn**: posts use UGC v2; body should avoid Markdown (prompts steer toward Unicode bold for emphasis).
- **X**: `tweepy` OAuth 1.0a user context; draft body uses `---` between tweets for threads.
- **Framer / Medium**: API URLs and fields may need adjustment per your workspace; see `.env.example` and platform docs.

## Tests

```bash
cd backend
pytest
```
