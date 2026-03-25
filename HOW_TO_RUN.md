# How to Run — Legal Content OS (Lawxy Reporter)

Complete setup and run guide for both backend and frontend.

---

## Prerequisites

| Tool | Version | Check |
|------|---------|-------|
| Python | 3.12+ | `python --version` |
| Node.js | 18+ | `node --version` |
| npm | 9+ | `npm --version` |
| Git | any | `git --version` |

---

## 1. Backend Setup

### 1.1 Navigate to backend

```bash
cd backend
```

### 1.2 Create Python virtual environment

```bash
python -m venv .venv
```

Activate it:

```bash
# Windows (PowerShell)
.venv\Scripts\Activate.ps1

# Windows (CMD)
.venv\Scripts\activate.bat

# Windows (Git Bash / WSL)
source .venv/Scripts/activate

# macOS / Linux
source .venv/bin/activate
```

You should see `(.venv)` in your terminal prompt.

### 1.3 Install dependencies

```bash
pip install -e ".[dev]"
```

This installs all production + development dependencies from `pyproject.toml`.

### 1.4 Create environment file

```bash
cp .env.example .env
```

Now edit `.env` and fill in the keys you need:

#### Minimum required (app will run without any keys, using stubs):

```env
DEBUG=true
DATA_DIR=./data
STATE_FILE=state.json
```

> With no API keys, the app runs fully — RSS feeds work, LLM returns stub content, publishing is simulated.

#### For real AI content generation (Groq — free):

1. Go to **https://console.groq.com/keys**
2. Create a free account and generate an API key
3. Add to your `.env`:

```env
OPENAI_API_KEY=gsk_your-groq-api-key-here
OPENAI_BASE_URL=https://api.groq.com/openai/v1
LLM_MODEL=llama-3.3-70b-versatile
```

> Groq is free and fast. The app uses the OpenAI SDK which is compatible with Groq's API.

#### Alternative: OpenAI (paid)

```env
OPENAI_API_KEY=sk-your-openai-key
OPENAI_BASE_URL=
LLM_MODEL=gpt-4o
```

#### For real publishing (optional, per platform):

```env
# LinkedIn
LINKEDIN_ACCESS_TOKEN=your-token
LINKEDIN_PERSON_URN=urn:li:person:your-id

# X / Twitter
TWITTER_API_KEY=your-key
TWITTER_API_SECRET=your-secret
TWITTER_ACCESS_TOKEN=your-token
TWITTER_ACCESS_TOKEN_SECRET=your-token-secret

# Reddit
REDDIT_CLIENT_ID=your-id
REDDIT_CLIENT_SECRET=your-secret
REDDIT_USERNAME=your-username
REDDIT_PASSWORD=your-password
REDDIT_SUBREDDIT=test

# Framer CMS
FRAMER_API_TOKEN=your-token
FRAMER_PROJECT_ID=your-project-id
FRAMER_COLLECTION_ID=your-collection-id

# Medium
MEDIUM_INTEGRATION_TOKEN=your-token
```

#### For web search (optional):

```env
TAVILY_API_KEY=your-tavily-key
```

### 1.5 Create data directory

```bash
mkdir data
```

### 1.6 Run the backend

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

You should see:

```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
```

### 1.7 Verify backend is running

Open in browser: **http://localhost:8000/api/health**

Expected response:

```json
{"status": "ok", "app": "Legal Content OS API"}
```

API docs available at: **http://localhost:8000/docs**

---

## 2. Frontend Setup

Open a **new terminal** (keep backend running in the first one).

### 2.1 Navigate to frontend

```bash
cd frontend
```

### 2.2 Install dependencies

```bash
npm install
```

### 2.3 Create environment file (optional)

```bash
echo "VITE_API_BASE=http://localhost:8000/api" > .env
```

> This is optional — the frontend defaults to `http://localhost:8000/api` if no env file exists.

### 2.4 Run the frontend

```bash
npm run dev
```

You should see:

```
  VITE v8.0.x  ready in 300ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.x.x:5173/
```

### 2.5 Open the app

Open in browser: **http://localhost:5173**

---

## 3. Running Both Together (Quick Reference)

You need **two terminal windows**:

**Terminal 1 — Backend:**
```bash
cd backend
source .venv/Scripts/activate   # or your OS equivalent
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

Then open **http://localhost:5173** in your browser.

---

## 4. Running Tests

### Backend tests

```bash
cd backend
source .venv/Scripts/activate
pytest tests/ -v
```

Expected: 6 tests pass.

### Frontend type check

```bash
cd frontend
npx tsc --noEmit
```

### Frontend production build

```bash
cd frontend
npm run build
```

Built files go to `frontend/dist/`.

---

## 5. Using the App

### Dashboard (Home)

1. The app opens on the **Dashboard** tab
2. Choose **Auto** or **Manual** mode:
   - **Manual** — you control each step (select articles, review drafts, approve publishing)
   - **Auto** — one-click runs the full pipeline (ingest → select → generate → publish)
3. Click **"Run Full Pipeline"** to execute everything at once

### Manual Workflow

1. **News Feed** tab → Click "Refresh Sources" to ingest articles from RSS feeds
2. Click any article → automatically navigates to **Studio** tab
3. Pick a platform (LinkedIn, X, Reddit, Framer, Medium)
4. Click **"Generate Draft"** — AI creates platform-specific content
5. Edit the draft text if needed
6. Click **"Publish Now"** or **"Schedule"** for later
7. Check **Scheduler** tab for queued posts
8. Check **Engagement** tab for comments and replies
9. Check **Analytics** tab for performance metrics

### Batch Generation

1. In **Studio** tab, click the **"Batch"** button
2. Select multiple platforms (e.g., LinkedIn + X + Framer)
3. Click **"Generate 3 Drafts"** — all created at once

### Engagement

1. Go to **Engagement** tab
2. Click **"Scan Engagement"** to find high-intent comments
3. Filter by "High Intent" to see questions and discussion starters
4. Reply manually or toggle **Auto-reply ON**

---

## 6. API Endpoints Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/articles` | List all articles |
| POST | `/api/articles/ingest` | Trigger RSS + web ingestion |
| GET | `/api/drafts` | List drafts |
| POST | `/api/drafts/generate` | Generate single draft |
| PATCH | `/api/drafts/{id}` | Update draft text |
| POST | `/api/publish/now` | Publish immediately |
| GET | `/api/publish/results` | List publish results |
| POST | `/api/schedule` | Create scheduled post |
| GET | `/api/schedule` | List schedules |
| DELETE | `/api/schedule/{id}` | Cancel schedule |
| GET | `/api/engagement/comments` | List comments |
| POST | `/api/engagement/reply` | Reply to comment |
| POST | `/api/engagement/auto-reply` | Toggle auto-reply |
| GET | `/api/analytics/overview` | Analytics summary |
| GET | `/api/pipeline/mode` | Get current mode |
| POST | `/api/pipeline/mode` | Set auto/manual mode |
| GET | `/api/pipeline/status` | Pipeline status + history |
| POST | `/api/pipeline/run` | Run full pipeline |
| POST | `/api/pipeline/auto-select` | Auto-select top articles |
| POST | `/api/pipeline/batch-generate` | Batch generate drafts |
| POST | `/api/pipeline/run-engagement` | Scan for high-intent comments |
| WS | `/ws/status` | Live status WebSocket |

Full interactive docs: **http://localhost:8000/docs**

---

## 7. Troubleshooting

### Backend won't start

**"ModuleNotFoundError"**
→ Make sure your virtual environment is activated and you ran `pip install -e ".[dev]"`

**"Address already in use"**
→ Another process is using port 8000. Either kill it or use a different port:
```bash
uvicorn app.main:app --reload --port 8001
```
Then update frontend `.env`: `VITE_API_BASE=http://localhost:8001/api`

### Frontend shows "Failed to fetch" errors

→ Backend is not running. Start it first.
→ Check that backend is on port 8000 (or update `VITE_API_BASE`).

### CORS errors in browser console

→ The backend has CORS configured to allow all origins by default. If you see CORS errors, check that you're accessing the frontend via `http://localhost:5173` (not `127.0.0.1` or a different port).

### RSS feeds return 0 articles

→ Some RSS feeds may be temporarily down or blocked. The app will still work — it just won't have articles from that source. Check backend logs for specific errors.

### LLM returns "[stub: set OPENAI_API_KEY...]"

→ No API key configured. Get a **free Groq key** at https://console.groq.com/keys and set these in `backend/.env`:
```env
OPENAI_API_KEY=gsk_your-key
OPENAI_BASE_URL=https://api.groq.com/openai/v1
LLM_MODEL=llama-3.3-70b-versatile
```

---

## 8. Project Structure

```
content-1/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app entry point
│   │   ├── api/                  # Routes, schemas, WebSocket
│   │   ├── core/                 # Config, logging
│   │   ├── llm/                  # AI content generation
│   │   ├── models/               # Data models
│   │   ├── platforms/            # LinkedIn, X, Reddit, Framer, Medium
│   │   ├── scheduler/            # Background job scheduling
│   │   ├── services/             # Content intelligence, engagement
│   │   ├── sources/              # RSS feeds, Tavily search
│   │   ├── state/                # In-memory store + JSON persistence
│   │   └── workflows/            # Ingestion, publishing pipelines
│   ├── tests/                    # Backend tests
│   ├── data/                     # Persistent state (auto-created)
│   ├── .env                      # Your environment config
│   ├── .env.example              # Template
│   └── pyproject.toml            # Python dependencies
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx               # Main app shell
│   │   ├── pages/                # Dashboard, NewsFeed, Studio, Scheduler, Engagement, Analytics
│   │   ├── components/           # Card, Badge, Header, Spinner, etc.
│   │   ├── hooks/                # WebSocket hook
│   │   ├── lib/                  # API client
│   │   ├── store/                # Zustand UI state
│   │   └── types.ts              # TypeScript types
│   ├── .env                      # Optional frontend config
│   ├── package.json              # Node dependencies
│   ├── tailwind.config.js        # Tailwind theme
│   └── vite.config.ts            # Vite bundler config
│
├── HOW_TO_RUN.md                 # This file
└── FRONTEND_DEVELOPER_GUIDE.md   # Detailed frontend API reference
```
cd backend
.venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 9000
sleep 4 && curl -s http://localhost:9000/api/health
cd backend
.venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 9000


# If you are in the root directory:
cd backend
.venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 9000 --reload
