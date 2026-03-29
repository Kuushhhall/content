# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Legal Content OS** is a backend-first content automation system for Indian legal news. It ingests RSS feeds, generates platform-specific content using LLMs, and publishes to LinkedIn, X (Twitter), Reddit, Framer, and Medium. The system includes a React frontend for manual control and monitoring.

## Development Commands

### Backend (FastAPI Python)
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -e ".[dev]"    # Install with development dependencies
cp .env.example .env       # Configure environment variables
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Testing:**
```bash
cd backend
pytest tests/ -v           # Run all backend tests
```

**Environment Setup:**
- Minimum: Set `DEBUG=true`, `DATA_DIR=./data`, `STATE_FILE=state.json`
- For real LLM: Get free Groq key at https://console.groq.com/keys and set:
  ```env
  OPENAI_API_KEY=gsk_your-key
  OPENAI_BASE_URL=https://api.groq.com/openai/v1
  LLM_MODEL=llama-3.3-70b-versatile
  ```
- Platform API keys: LinkedIn, X, Reddit, Framer, Medium (see `.env.example`)

### Frontend (React + TypeScript + Vite)
```bash
cd frontend
npm install
npm run dev              # Development server on http://localhost:5173
npm run build           # Production build to dist/
npm run lint            # ESLint
npx tsc --noEmit        # Type check without building
```

**Frontend Environment:**
- Optional `.env` file: `VITE_API_BASE=http://localhost:8000/api`
- Defaults to `http://localhost:8000/api` if no env file

### Running Both Services
1. **Terminal 1 (Backend):** `cd backend && uvicorn app.main:app --reload --port 8000`
2. **Terminal 2 (Frontend):** `cd frontend && npm run dev`
3. Open browser: http://localhost:5173

## Architecture

### Backend Structure
```
backend/app/
├── main.py              # FastAPI app entry point with lifespan management
├── api/                 # REST endpoints and WebSocket
│   ├── routes/         # HTTP route handlers (articles, drafts, publish, etc.)
│   ├── schemas.py      # Pydantic models for request/response
│   └── ws.py           # WebSocket for live status updates
├── core/               # Configuration and logging
├── llm/                # AI content generation pipeline
│   ├── pipeline.py     # Multi-step content generation
│   ├── prompts/        # Platform-specific prompt templates
│   └── service.py      # LLM client (OpenAI-compatible)
├── models/             # Data models (SQLAlchemy + Pydantic)
├── platforms/          # Platform integrations
│   ├── base.py         # Abstract platform interface
│   ├── dispatch.py     # Platform routing and publishing
│   └── [platform].py   # LinkedIn, X, Reddit, Framer, Medium
├── scheduler/          # Background job scheduling (APScheduler)
├── services/           # Business logic (content intelligence, engagement)
├── sources/            # Data ingestion (RSS, Tavily web search)
├── state/              # In-memory store with JSON persistence
├── workflows/          # Pipeline workflows (ingest, publish)
└── database.py         # PostgreSQL integration (optional)
```

**Key Architectural Decisions:**
- **No Celery/Redis**: Uses `APScheduler` for in-process periodic tasks
- **State Management**: In-memory store persisted to JSON file (`data/state.json`)
- **Database Optional**: Can use PostgreSQL via SQLAlchemy or fallback to JSON
- **LLM Agnostic**: Works with OpenAI, Groq, Azure, or any OpenAI-compatible API
- **WebSocket Status**: Real-time system status updates to frontend

### Frontend Structure
```
frontend/src/
├── App.tsx             # Main app shell with tab navigation
├── pages/              # Page components
│   ├── Dashboard.tsx   # Home with pipeline controls
│   ├── NewsFeed.tsx    # Article discovery and ingestion
│   ├── ContentStudio.tsx # Draft generation and editing
│   ├── PostScheduler.tsx # Scheduled posts management
│   ├── EngagementHub.tsx # Comment monitoring and replies
│   └── Analytics.tsx   # Performance metrics and charts
├── components/         # Reusable UI components
├── hooks/              # Custom React hooks (WebSocket, etc.)
├── lib/                # API client and utilities
├── store/              # Zustand state management
└── types.ts            # TypeScript interfaces matching backend
```

**Frontend Tech Stack:**
- **Framework**: React 18 + TypeScript
- **Styling**: Tailwind CSS with custom dark theme
- **State**: Zustand (UI) + TanStack React Query (server)
- **Charts**: Recharts for analytics
- **Animations**: Framer Motion
- **Rich Text**: Tiptap for draft editing
- **Routing**: React Router DOM

## API Endpoints

Base URL: `http://localhost:8000/api`

**Core Workflow:**
1. `POST /articles/ingest` - Trigger RSS + web ingestion
2. `GET /articles` - List ingested articles
3. `POST /drafts/generate` - Generate AI draft for article + platform
4. `PATCH /drafts/{id}` - Update draft text
5. `POST /publish/now` - Publish immediately
6. `POST /schedule` - Schedule for future publishing
7. `GET /engagement/comments` - Monitor platform comments
8. `POST /engagement/reply` - Reply to comments

**WebSocket:** `ws://localhost:8000/ws/status` - Live system status every 2 seconds

## Data Models

**Article**: Legal news from RSS feeds or web search
- `id`, `source` (LiveLaw, BarAndBench, etc.), `title`, `url`, `summary_hint`, `published_at`, `kind` (rss/tavily)

**Draft**: Platform-specific AI-generated content
- `id`, `article_id`, `platform` (linkedin/x/reddit/framer/medium), `body`, `summary`

**Schedule**: Future publishing jobs
- `id`, `draft_id`, `platform`, `run_at`, `status` (pending/running/completed/failed/cancelled)

**EngagementComment**: Platform comments on published posts
- `id`, `platform`, `author`, `text`, `status` (new/replied/ignored), `ai_suggested_reply`

## Platform-Specific Considerations

1. **LinkedIn**: Plain text with Unicode bold (`**bold**` → `𝗯𝗼𝗹𝗱`), ~2200 chars, UGC v2 API
2. **X (Twitter)**: Thread format with `---` separators, 280 chars/tweet, max 15 tweets
3. **Reddit**: Markdown support, includes "TITLE:" prefix in body
4. **Framer**: JSON structure with `title`, `slug`, `excerpt`, `body_md` fields
5. **Medium**: Markdown with `TITLE`, `SUBTITLE`, `BODY_MARKDOWN` sections

## Testing

**Backend Tests:** Located in `backend/tests/`
- `test_rss.py` - RSS feed parsing
- `test_llm_stub.py` - LLM stub behavior
- `test_schedule.py` - Scheduling logic
- `test_dispatch.py` - Platform dispatch
- `test_persistence.py` - State persistence

**Frontend Testing:** Use `npm run lint` and `npx tsc --noEmit` for type checking

## Development Notes

### State Management
- **Backend**: In-memory `StateStore` with automatic JSON persistence to `data/state.json`
- **Frontend**: Zustand for UI state, React Query for server state caching

### Error Handling
- Backend returns standard HTTP errors with JSON `{ "detail": "message" }`
- Frontend validates before API calls (article + platform required for draft generation)
- WebSocket auto-reconnects on disconnect

### Environment Configuration
- Backend: `.env` file in `backend/` directory (copy from `.env.example`)
- Frontend: Optional `.env` with `VITE_API_BASE` (defaults to `http://localhost:8000/api`)

### Database (Optional)
- PostgreSQL via SQLAlchemy if `DATABASE_URL` is set in environment
- Falls back to JSON file storage if no database configured
- Alembic migrations available in `backend/alembic/`

## Common Development Tasks

1. **Adding a new platform**: Implement `PlatformBase` in `backend/app/platforms/`, add to `dispatch.py`
2. **Modifying LLM prompts**: Edit templates in `backend/app/llm/prompts/`
3. **Adding RSS sources**: Update `rss_*` variables in `backend/app/core/config.py`
4. **Frontend component extraction**: Components are currently inline in `App.tsx` - can be moved to separate files
5. **Testing new features**: Backend uses pytest with async support, frontend uses TypeScript for type safety

## Troubleshooting

- **Backend won't start**: Check virtual environment activation and `pip install -e ".[dev]"`
- **Frontend "Failed to fetch"**: Ensure backend is running on port 8000
- **LLM returns stub content**: Set `OPENAI_API_KEY` with Groq or OpenAI key
- **CORS errors**: Backend allows all origins by default; access frontend via `http://localhost:5173`
- **RSS feeds return 0 articles**: Some feeds may be temporarily down; check backend logs