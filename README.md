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


cd /c/Users/kushal/Downloads/content-1/backend && .venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 9000 2>&1 &

cd /c/Users/kushal/Downloads/content-1/backend && .venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 9000 2>&1 &

Bash Start backend on port 9000
IN
cd /c/Users/kushal/Downloads/content-1/backend && .venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 9000 2>&1 &

OUT
Command running in background with ID: bwq701jho. Output is being written to: C:\Users\kushal\AppData\Local\Temp\claude\c--Users-kushal-Downloads-content-1\73696d40-8f28-4214-8ace-48ded76ad996\tasks\bwq701jho.output
Bash Verify backend
IN
sleep 4 && curl -s http://localhost:9000/api/health

OUT
{"status":"ok","app":"Legal Content OS API"}
Backend is running on http://localhost:9000.

For future reference, the command is:


cd backend
.venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 9000
Backend stopped (likely port 9000 was already in use from a previous instance). Let me check:

Bash Check if backend is still up
IN
curl -s http://localhost:9000/api/health 2>&1 || echo "DOWN"

OUT
{"status":"ok","app":"Legal Content OS API"}
It's still running — the new process exited because the old one was already on port 9000. You're good.