import type {
  AnalyticsOverview,
  Article,
  AutoSelectResult,
  BatchDraftResult,
  Draft,
  EngagementComment,
  EngagementScanResult,
  PaginatedResponse,
  PipelineRun,
  PipelineStatus,
  Platform,
  PublishResult,
  Schedule,
} from '../types'

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:9000/api'

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
  // Articles
  ingest: () => request<{ upserted: number }>('/articles/ingest', { method: 'POST' }),
  listArticles: (page = 1, pageSize = 20, source?: string, sort_by = 'published_at', order = 'desc') => {
    const params = new URLSearchParams()
    params.append('page', page.toString())
    params.append('page_size', pageSize.toString())
    if (source) params.append('source', source)
    params.append('sort_by', sort_by)
    params.append('order', order)
    return request<PaginatedResponse<Article>>(`/articles?${params.toString()}`)
  },

  // Drafts
  listDrafts: (articleId?: string, page = 1, pageSize = 20) => {
    const params = new URLSearchParams()
    params.append('page', page.toString())
    params.append('page_size', pageSize.toString())
    if (articleId) params.append('article_id', articleId)
    return request<PaginatedResponse<Draft>>(`/drafts?${params.toString()}`)
  },
  generateDraft: (articleId: string, platform: string) =>
    request<Draft>('/drafts/generate', {
      method: 'POST',
      body: JSON.stringify({ article_id: articleId, platform }),
    }),
  updateDraft: (draftId: string, body: string) =>
    request<Draft>(`/drafts/${draftId}`, {
      method: 'PATCH',
      body: JSON.stringify({ body }),
    }),

  // Publish
  publishNow: (draftId: string) =>
    request<PublishResult>('/publish/now', {
      method: 'POST',
      body: JSON.stringify({ draft_id: draftId }),
    }),
  listPublishResults: (page = 1, pageSize = 20) => 
    request<PaginatedResponse<PublishResult>>(`/publish/results?page=${page}&limit=${pageSize}`),

  // Schedule
  createSchedule: (draftId: string, platform: string, runAt: string) =>
    request<Schedule>('/schedule', {
      method: 'POST',
      body: JSON.stringify({ draft_id: draftId, platform, run_at: runAt }),
    }),
  listSchedules: (page = 1, pageSize = 20) => 
    request<PaginatedResponse<Schedule>>(`/schedule?page=${page}&limit=${pageSize}`),
  cancelSchedule: (scheduleId: string) =>
    request<Schedule>(`/schedule/${scheduleId}`, { method: 'DELETE' }),

  // Engagement
  listComments: (platform?: string, page = 1, pageSize = 20) => {
    const params = new URLSearchParams()
    params.append('page', page.toString())
    params.append('page_size', pageSize.toString())
    if (platform) params.append('platform', platform)
    return request<PaginatedResponse<EngagementComment>>(`/engagement/comments?${params.toString()}`)
  },
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

  // Analytics
  analyticsOverview: () => request<AnalyticsOverview>('/analytics/overview'),

  // Pipeline
  getPipelineMode: () => request<{ mode: string }>('/pipeline/mode'),
  setPipelineMode: (mode: 'auto' | 'manual') =>
    request<{ mode: string }>('/pipeline/mode', {
      method: 'POST',
      body: JSON.stringify({ mode }),
    }),
  getPipelineStatus: () => request<PipelineStatus>('/pipeline/status'),
  runPipeline: () => request<PipelineRun>('/pipeline/run', { method: 'POST' }),
  autoSelectArticles: (count?: number) =>
    request<AutoSelectResult>(`/pipeline/auto-select${count ? `?count=${count}` : ''}`, {
      method: 'POST',
    }),
  batchGenerate: (articleId: string, platforms: Platform[]) =>
    request<BatchDraftResult>('/pipeline/batch-generate', {
      method: 'POST',
      body: JSON.stringify({ article_id: articleId, platforms }),
    }),
  runEngagement: () => request<EngagementScanResult>('/pipeline/run-engagement', { method: 'POST' }),
}

export function getStatusWsUrl(): string {
  const direct = import.meta.env.VITE_WS_URL
  if (direct) {
    return direct
  }
  const base = API_BASE.replace(/\/api\/?$/, '')
  return base.replace('http://', 'ws://').replace('https://', 'wss://') + '/ws/status'
}
