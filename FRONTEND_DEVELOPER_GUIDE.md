# Legal Content OS — Frontend Developer Guide

> Complete reference for building the frontend against the backend API.
> Backend runs on `http://localhost:8000`. All endpoints prefixed with `/api`.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Tech Stack (Current)](#tech-stack)
3. [API Reference](#api-reference)
4. [WebSocket](#websocket)
5. [Data Models / TypeScript Types](#data-models)
6. [Page-by-Page UI Specification](#page-by-page-ui-specification)
7. [User Flows](#user-flows)
8. [State Management](#state-management)
9. [Environment Variables](#environment-variables)
10. [Error Handling Patterns](#error-handling-patterns)
11. [Existing Frontend Code Map](#existing-frontend-code-map)

---

## Architecture Overview

```
┌─────────────┐    REST + WS     ┌──────────────────────────┐
│   Frontend   │ ◄──────────────► │  FastAPI Backend :8000   │
│  (React+TS)  │                  │                          │
│  Vite :5173  │                  │  /api/articles           │
│              │                  │  /api/drafts             │
│  Zustand     │                  │  /api/publish            │
│  React Query │                  │  /api/schedule           │
│  Tailwind    │                  │  /api/engagement         │
│  Recharts    │                  │  /api/analytics          │
│              │                  │  /ws/status              │
└─────────────┘                  └──────────────────────────┘
```

**Pipeline**: Discover → Generate → Publish → Engage → Analyze

---

## Tech Stack

| Layer | Library | Version |
|-------|---------|---------|
| Framework | React | 18.3.1 |
| Language | TypeScript | 5.9.3 |
| Bundler | Vite | 8.0.1 |
| Styling | Tailwind CSS | 3.4.13 |
| State (UI) | Zustand | 5.0.12 |
| State (Server) | TanStack React Query | 5.95.2 |
| Animation | Framer Motion | 12.38.0 |
| Charts | Recharts | 3.8.0 |

**Color Palette** (defined in `tailwind.config.js`):
- `ink` → `#0e1324` (background)
- `cream` → `#efe7d7` (primary text)
- `amber` → `#b9893b` (accent/CTA)
- `panel` → `#141a2e` (card backgrounds)
- `stroke` → `#2a3457` (borders)
- `muted` → `#a6b0cf` (secondary text)

**Fonts**: Inter (sans), Fraunces (serif)

---

## API Reference

Base URL: `http://localhost:8000/api`

### Health

| Method | Path | Response |
|--------|------|----------|
| GET | `/health` | `{ status: "ok", app: "Legal Content OS API" }` |

---

### Articles (Discover)

#### `GET /articles`
Returns all ingested articles sorted by `published_at` descending.

**Response**: `ArticleOut[]`
```json
[
  {
    "id": "a1b2c3d4...",
    "source": "LiveLaw",
    "title": "Supreme Court ruling on...",
    "url": "https://...",
    "summary_hint": "Brief excerpt...",
    "published_at": "2026-03-25T10:00:00Z",
    "kind": "rss"
  }
]
```

#### `GET /articles/{article_id}`
Returns single article by ID. **404** if not found.

#### `POST /articles/ingest`
Triggers RSS + Tavily ingestion. No request body.

**Response**: `{ "upserted": 12 }`

---

### Drafts (Generate)

#### `GET /drafts?article_id={id}`
List drafts. Optional `article_id` query param to filter.

**Response**: `DraftOut[]`
```json
[
  {
    "id": "d_abc123",
    "article_id": "a1b2c3d4...",
    "platform": "linkedin",
    "body": "🔥 Breaking legal update...",
    "summary": "The Supreme Court..."
  }
]
```

#### `POST /drafts/generate`
Generate a new AI draft for a specific article + platform.

**Request**:
```json
{
  "article_id": "a1b2c3d4...",
  "platform": "linkedin",    // "linkedin" | "x" | "reddit" | "framer" | "medium"
  "draft_id": "d_existing"   // optional — regenerate into existing draft
}
```

**Response**: `DraftOut`

> **IMPORTANT**: Requires both `article_id` AND `platform`. Validate on frontend before calling.

#### `GET /drafts/{draft_id}`
Single draft. **404** if not found.

#### `PATCH /drafts/{draft_id}`
Update draft body (user edits).

**Request**: `{ "body": "Updated content..." }`
**Response**: Updated `DraftOut`

---

### Publish

#### `POST /publish/now`
Publish a draft immediately to its platform.

**Request**: `{ "draft_id": "d_abc123" }`

**Response**: `PublishResultOut`
```json
{
  "platform": "linkedin",
  "success": true,
  "external_id": "urn:li:share:123456",
  "message": null,
  "at": "2026-03-25T12:00:00Z"
}
```

> On failure: `success: false`, `message` contains error description.

#### `GET /publish/results?limit=50`
Recent publish results. Default limit: 50.

**Response**: `PublishResultOut[]`

---

### Schedule

#### `POST /schedule`
Schedule a draft for future publishing.

**Request**:
```json
{
  "draft_id": "d_abc123",
  "platform": "linkedin",
  "run_at": "2026-03-26T09:00:00Z"
}
```

**Response**: `ScheduleOut`
```json
{
  "id": "sch_abc123",
  "draft_id": "d_abc123",
  "platform": "linkedin",
  "run_at": "2026-03-26T09:00:00Z",
  "status": "pending",
  "error": null
}
```

#### `GET /schedule?status=pending`
List schedules. Optional `status` filter: `"pending"` | `"running"` | `"completed"` | `"failed"` | `"cancelled"`.

Sorted by `run_at`.

#### `DELETE /schedule/{schedule_id}`
Cancel a pending schedule. Returns the updated `ScheduleOut` with `status: "cancelled"`.

---

### Engagement

#### `GET /engagement/comments?platform=linkedin`
List engagement comments. Optional `platform` filter. Sorted by `created_at` desc.

> If no comments exist, backend auto-seeds a demo comment.

**Response**: `EngagementCommentOut[]`
```json
[
  {
    "id": "c_abc123",
    "platform": "linkedin",
    "author": "Legal Professional",
    "text": "Great analysis!",
    "source_post_id": "urn:li:share:123",
    "created_at": "2026-03-25T12:30:00Z",
    "status": "new",
    "ai_suggested_reply": "Thank you! Lawxy Reporter..."
  }
]
```

#### `POST /engagement/reply`
Reply to a comment.

**Request**:
```json
{
  "comment_id": "c_abc123",
  "reply_text": "Thank you for your feedback!"  // optional
}
```

**Response**: Updated `EngagementCommentOut` with `status: "replied"`

#### `POST /engagement/auto-reply`
Toggle auto-reply feature.

**Request**: `{ "enabled": true }`
**Response**: `{ "enabled": true }`

---

### Analytics

#### `GET /analytics/overview`
Aggregated publishing stats.

**Response**:
```json
{
  "total_posts": 42,
  "success_posts": 38,
  "failed_posts": 4,
  "success_rate": 0.905,
  "by_platform": {
    "linkedin": 15,
    "x": 10,
    "reddit": 8,
    "framer": 5,
    "medium": 4
  }
}
```

---

## WebSocket

### `ws://localhost:8000/ws/status`

Sends JSON messages every **2 seconds**:

```json
{
  "at": "2026-03-25T12:00:00Z",
  "articles": 45,
  "drafts": 12,
  "pendingSchedules": 3,
  "recentPublishes": 28,
  "autoReplyEnabled": false
}
```

**Usage**: Show live system status badge/pill in the header. Reconnect on close.

---

## Data Models

These TypeScript types match the backend schemas exactly (already defined in `src/types.ts`):

```typescript
type TabKey = "feed" | "studio" | "scheduler" | "engage" | "analytics";

type Platform = "linkedin" | "x" | "reddit" | "framer" | "medium";

interface Article {
  id: string;
  source: string;           // "LiveLaw", "BarAndBench", "TavilySCC", etc.
  title: string;
  url: string;
  summary_hint: string;
  published_at: string | null;  // ISO 8601
  kind: string;              // "rss" | "tavily" | "manual"
}

interface Draft {
  id: string;
  article_id: string;
  platform: string;
  body: string;
  summary: string | null;
}

interface Schedule {
  id: string;
  draft_id: string;
  platform: string;
  run_at: string;            // ISO 8601
  status: string;            // "pending" | "running" | "completed" | "failed" | "cancelled"
  error: string | null;
}

interface PublishResult {
  platform: string;
  success: boolean;
  external_id: string | null;
  message: string | null;
  at: string;                // ISO 8601
}

interface EngagementComment {
  id: string;
  platform: string;
  author: string;
  text: string;
  source_post_id: string | null;
  created_at: string;        // ISO 8601
  status: string;            // "new" | "replied" | "ignored"
  ai_suggested_reply: string | null;
}

interface AnalyticsOverview {
  total_posts: number;
  success_posts: number;
  failed_posts: number;
  success_rate: number;      // 0.0 - 1.0
  by_platform: Record<string, number>;
}

interface StatusFeed {
  at: string;
  articles: number;
  drafts: number;
  pendingSchedules: number;
  recentPublishes: number;
  autoReplyEnabled: boolean;
}
```

---

## Page-by-Page UI Specification

The app uses a **5-tab layout**. Current implementation is in `App.tsx` with inline components.

### Tab 1: News Feed (Discover)

**Purpose**: Browse ingested legal news articles and trigger ingestion.

**Components needed**:
- **"Refresh Sources" button** → calls `POST /articles/ingest`
  - Show loading spinner during ingestion
  - Show toast: "Ingested {n} articles"
- **Article list** (scrollable, max-height ~520px)
  - Each card shows: `title`, `source` badge, `published_at` (relative time), `kind` badge
  - Click to select → sets `selectedArticleId`
  - Selected article highlighted with amber border
  - Link icon to open `url` in new tab
- **Empty state**: "No articles yet. Click Refresh Sources."

**Queries**:
- `useQuery(['articles'], api.listArticles)`
- `useMutation(api.ingestArticles, { onSuccess: invalidate 'articles' })`

---

### Tab 2: Content Studio (Generate)

**Purpose**: Generate, edit, and publish AI drafts for selected articles.

**Components needed**:
- **Article selector** (shows currently selected article title, or prompt to select)
- **Platform picker** — 5 buttons: LinkedIn, X, Reddit, Framer, Medium
  - Each with platform icon/emoji and label
  - Active platform highlighted
- **"Generate Draft" button** → calls `POST /drafts/generate`
  - **Validation**: Must have both `selectedArticleId` AND `platform` selected
  - Show error toast if either is missing
  - Loading state during generation (~5-15 seconds)
- **Draft editor** (textarea)
  - Pre-filled with generated `body`
  - Editable by user
  - Character count display (useful for X: 280/tweet, LinkedIn: ~2200)
- **Action buttons**:
  - "Save" → `PATCH /drafts/{id}` with edited body
  - "Publish Now" → `POST /publish/now` with `draft_id`
    - Show success/failure toast with platform info
  - "Schedule" → Opens datetime picker, then `POST /schedule`
- **Draft history sidebar** — list previous drafts for this article
  - Filter: `GET /drafts?article_id={id}`
  - Click to load into editor

**Queries**:
- `useQuery(['drafts', articleId], () => api.listDrafts(articleId))`
- `useMutation(api.generateDraft)`
- `useMutation(api.updateDraft)`
- `useMutation(api.publishNow)`
- `useMutation(api.createSchedule)`

---

### Tab 3: Post Scheduler

**Purpose**: View and manage scheduled posts.

**Components needed**:
- **Schedule list** with columns: Platform, Draft ID, Scheduled Time, Status
  - Status badges: pending (yellow), running (blue), completed (green), failed (red), cancelled (gray)
  - Failed items show error message on hover/expand
- **Cancel button** on pending items → `DELETE /schedule/{id}`
- **Filter tabs**: All | Pending | Completed | Failed
  - Uses `?status=` query param

**Queries**:
- `useQuery(['schedules'], api.listSchedules)`
- `useMutation(api.cancelSchedule)`

---

### Tab 4: Engagement Hub

**Purpose**: Monitor and reply to comments on published posts.

**Components needed**:
- **Comment feed** — list of comments with:
  - Author name, platform badge, timestamp
  - Comment text
  - Status: "new" (unread indicator), "replied", "ignored"
  - AI suggested reply (collapsible, pre-filled)
- **Reply composer**:
  - Textarea pre-filled with `ai_suggested_reply` (if available)
  - "Send Reply" button → `POST /engagement/reply`
- **Auto-reply toggle** — switch/checkbox
  - Current state from WebSocket `autoReplyEnabled`
  - Toggle → `POST /engagement/auto-reply`
- **Platform filter** dropdown

**Queries**:
- `useQuery(['comments'], api.listComments)`
- `useMutation(api.replyToComment)`
- `useMutation(api.toggleAutoReply)`

---

### Tab 5: Analytics

**Purpose**: Visualize publishing performance.

**Components needed**:
- **Metric cards** (4):
  - Total Posts (`total_posts`)
  - Success Rate (`success_rate` × 100 + "%")
  - Successful (`success_posts`)
  - Failed (`failed_posts`)
- **Bar chart**: Posts by platform (from `by_platform` object)
  - X-axis: platform names
  - Y-axis: post count
  - Color: amber
- **Pie/Donut chart**: Platform distribution
- **Publish history table** (optional enhancement):
  - `GET /publish/results?limit=50`
  - Columns: Platform, Status (✓/✗), External ID (link), Time, Message

**Queries**:
- `useQuery(['analytics'], api.getAnalyticsOverview)`
- `useQuery(['publishResults'], api.listPublishResults)` (optional)

---

### Global: Status Bar / Header

**Components needed**:
- **App logo**: "Lawxy Reporter" / "Legal Content OS"
- **Status pill** (from WebSocket):
  - Articles count, Drafts count, Pending schedules, Recent publishes
  - Auto-reply indicator (on/off)
  - Pulse animation when connected
- **Tab navigation bar**

---

## User Flows

### Flow 1: Discover & Generate Content
```
1. User opens app → News Feed tab is active
2. Clicks "Refresh Sources" → POST /articles/ingest
3. Article list populates → User clicks an article (selected)
4. Switches to Content Studio tab
5. Selects platform (e.g., LinkedIn)
6. Clicks "Generate Draft" → POST /drafts/generate
7. AI-generated draft appears in editor
8. User edits text → Clicks "Save" → PATCH /drafts/{id}
```

### Flow 2: Publish Immediately
```
1. User has a draft in Content Studio
2. Clicks "Publish Now" → POST /publish/now
3. Toast shows success/failure
4. Publish result appears in Analytics tab
5. Comment auto-seeded in Engagement Hub
```

### Flow 3: Schedule for Later
```
1. User has a draft in Content Studio
2. Picks datetime → Clicks "Schedule"
3. POST /schedule creates pending schedule
4. Schedule appears in Scheduler tab
5. Backend auto-publishes when run_at arrives
6. Status updates: pending → running → completed/failed
```

### Flow 4: Engage with Comments
```
1. After publishing, comments appear in Engagement Hub
2. User sees AI-suggested reply
3. Edits reply text → Clicks "Send Reply"
4. POST /engagement/reply updates status to "replied"
5. Optional: Toggle auto-reply for hands-free engagement
```

---

## State Management

### UI State (Zustand — `src/store/uiStore.ts`)
```typescript
interface UIState {
  tab: TabKey;
  selectedArticleId: string | null;
  selectedDraftId: string | null;
  scheduleDraftId: string | null;
  setTab(tab: TabKey): void;
  setSelectedArticleId(id: string | null): void;
  setSelectedDraftId(id: string | null): void;
  setScheduleDraftId(id: string | null): void;
}
```

### Server State (React Query)
All API data fetched/cached via React Query. Key query keys:
- `['articles']`
- `['drafts', articleId?]`
- `['schedules', status?]`
- `['comments', platform?]`
- `['analytics']`
- `['publishResults']`

**Invalidation rules** (after mutations):
- After `ingestArticles` → invalidate `['articles']`
- After `generateDraft` → invalidate `['drafts']`
- After `updateDraft` → invalidate `['drafts']`
- After `publishNow` → invalidate `['publishResults']`, `['analytics']`, `['comments']`
- After `createSchedule` → invalidate `['schedules']`
- After `cancelSchedule` → invalidate `['schedules']`
- After `replyToComment` → invalidate `['comments']`

---

## Environment Variables

Create `frontend/.env`:
```
VITE_API_BASE=http://localhost:8000/api
```

The WebSocket URL is derived by replacing `http` with `ws` and `/api` with `/ws`:
```
ws://localhost:8000/ws/status
```

---

## Error Handling Patterns

1. **API errors**: Backend returns standard HTTP errors with JSON `{ "detail": "message" }`.
   - 404: Resource not found
   - 422: Validation error (missing fields)
   - 500: Server error

2. **Frontend validation** (do BEFORE API calls):
   - Draft generation: Require `selectedArticleId` + `platform`
   - Schedule creation: Require `draft_id` + `run_at` (must be future)
   - Reply: Require `comment_id`

3. **Toast/notification patterns**:
   - Success: Green toast with action result
   - Error: Red toast with `detail` message from API
   - Loading: Spinner/skeleton during mutations

4. **WebSocket reconnection**: If connection drops, attempt reconnect after 3s delay.

---

## Existing Frontend Code Map

The frontend already has a working implementation. Key files:

| File | Purpose |
|------|---------|
| `src/main.tsx` | Entry point, React Query provider |
| `src/App.tsx` | Main layout, all 5 tabs, inline components |
| `src/types.ts` | TypeScript interfaces matching backend |
| `src/lib/api.ts` | All API functions + fetch wrapper |
| `src/store/uiStore.ts` | Zustand UI state |
| `src/hooks/useStatusSocket.ts` | WebSocket hook for live status |
| `src/components/Card.tsx` | Reusable card component |
| `src/index.css` | Global styles, fonts, Tailwind |
| `tailwind.config.js` | Custom theme colors/fonts |

### What's already implemented:
- All API calls are wired up in `src/lib/api.ts`
- All types defined in `src/types.ts`
- Tab navigation with Zustand
- WebSocket status feed
- Article list with selection
- Draft generation + editing + saving
- Platform picker (5 platforms)
- Publish now functionality
- Schedule creation with datetime picker
- Engagement comments display + reply
- Auto-reply toggle
- Analytics with Recharts bar/pie charts
- Metric cards
- Framer Motion tab transitions

### Recommended improvements:
1. **Extract inline components** from `App.tsx` into separate files
2. **Add loading skeletons** for each data section
3. **Add toast notifications** (e.g., react-hot-toast)
4. **Add confirmation dialogs** for publish/delete actions
5. **Add platform icons** (SVG or emoji) for visual clarity
6. **Add responsive mobile layout** improvements
7. **Add draft version history** / diff view
8. **Add bulk operations** (publish multiple drafts)
9. **Add search/filter** for articles by source or keyword
10. **Add dark/light theme toggle** (current is dark-only)

---

## Platform-Specific Content Notes

When displaying drafts, be aware of platform formatting:

| Platform | Format | Max Length | Special |
|----------|--------|------------|---------|
| LinkedIn | Plain text (Unicode bold) | ~2200 chars | Hook + insight + hashtags + question |
| X/Twitter | Thread (split by `---`) | 280 chars/tweet, max 15 | Show thread preview |
| Reddit | Markdown | No hard limit | Has "TITLE:" prefix parsed out |
| Framer | JSON → Markdown blog | 300-400 words | Fields: title, slug, excerpt, body_md |
| Medium | Markdown → HTML | No hard limit | Fields: TITLE, SUBTITLE, BODY_MARKDOWN |

**UI tip**: For X/Twitter drafts, split the `body` by `---` and show each segment as a separate tweet preview with character counts.

---

## Quick Start

```bash
cd frontend
npm install
npm run dev
# Opens http://localhost:5173

# Make sure backend is running:
cd ../backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
