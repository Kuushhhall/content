import type {
  AnalyticsOverview,
  Article,
  Draft,
  EngagementComment,
  PublishResult,
  Schedule,
} from '../types'

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000/api'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `Request failed (${response.status})`)
  }
  return (await response.json()) as T
}

export const api = {
  ingest: () => request<{ upserted: number }>('/articles/ingest', { method: 'POST' }),
  listArticles: () => request<Article[]>('/articles'),
  listDrafts: (articleId?: string) => request<Draft[]>(`/drafts${articleId ? `?article_id=${encodeURIComponent(articleId)}` : ''}`),
  generateDraft: (articleId: string, platform: Draft['platform']) =>
    request<Draft>('/drafts/generate', {
      method: 'POST',
      body: JSON.stringify({ article_id: articleId, platform }),
    }),
  updateDraft: (draftId: string, body: string) =>
    request<Draft>(`/drafts/${draftId}`, {
      method: 'PATCH',
      body: JSON.stringify({ body }),
    }),
  publishNow: (draftId: string) =>
    request<PublishResult>('/publish/now', {
      method: 'POST',
      body: JSON.stringify({ draft_id: draftId }),
    }),
  listPublishResults: () => request<PublishResult[]>('/publish/results?limit=100'),
  createSchedule: (draftId: string, platform: string, runAt: string) =>
    request<Schedule>('/schedule', {
      method: 'POST',
      body: JSON.stringify({ draft_id: draftId, platform, run_at: runAt }),
    }),
  listSchedules: () => request<Schedule[]>('/schedule'),
  listComments: (platform?: string) =>
    request<EngagementComment[]>(`/engagement/comments${platform ? `?platform=${encodeURIComponent(platform)}` : ''}`),
  replyComment: (commentId: string, replyText: string) =>
    request<EngagementComment>('/engagement/reply', {
      method: 'POST',
      body: JSON.stringify({ comment_id: commentId, reply_text: replyText }),
    }),
  toggleAutoReply: (enabled: boolean) =>
    request<{ enabled: boolean }>('/engagement/auto-reply', {
      method: 'POST',
      body: JSON.stringify({ enabled }),
    }),
  analyticsOverview: () => request<AnalyticsOverview>('/analytics/overview'),
}

export function getStatusWsUrl(): string {
  const direct = import.meta.env.VITE_WS_URL
  if (direct) {
    return direct
  }
  const base = API_BASE.replace(/\/api\/?$/, '')
  return base.replace('http://', 'ws://').replace('https://', 'wss://') + '/ws/status'
}
