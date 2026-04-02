import type {
  Article,
  CostRecord,
  CostSummary,
  Draft,
  PaginatedResponse,
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
    let errorMessage = `Request failed (${response.status})`
    try {
      const errorData = await response.json()
      errorMessage = errorData.detail || errorData.message || errorMessage
    } catch {
      const text = await response.text()
      if (text) errorMessage = text
    }
    throw new Error(errorMessage)
  }
  return (await response.json()) as T
}

export const api = {
  // Articles
  listArticles: (page = 1, pageSize = 50) =>
    request<PaginatedResponse<Article>>(`/articles?page=${page}&page_size=${pageSize}`),

  runCycle: () =>
    request<{ cycle_id: string; total_articles: number; top_10_ids: string[]; drafts_created: number; draft_ids: string[]; errors: string[]; timestamp: string }>(
      '/articles/run-cycle',
      { method: 'POST' },
    ),

  getCycleProgress: () =>
    request<{ cycle_id: string; status: string; started_at: string; finished_at: string; step: string; step_detail: string; total_articles: number; articles_fetched: number; top_10_ids: string[]; drafts_created: number; errors: string[] }>(
      '/articles/cycle-progress',
    ),

  resetCycle: () =>
    request<{ status: string }>(
      '/articles/reset-cycle',
      { method: 'POST' },
    ),

  deleteArticle: (articleId: string) =>
    request<{ success: boolean; deleted_id: string }>(`/articles/${articleId}`, { method: 'DELETE' }),

  // Drafts
  listDrafts: (platform?: string) => {
    const params = platform ? `?platform=${platform}` : ''
    return request<{ items: Draft[]; total: number }>(`/drafts${params}`)
  },

  getDraft: (draftId: string) =>
    request<Draft>(`/drafts/${draftId}`),

  updateDraft: (draftId: string, body: string) =>
    request<Draft>(`/drafts/${draftId}`, {
      method: 'PATCH',
      body: JSON.stringify({ body }),
    }),

  deleteDraft: (draftId: string) =>
    request<{ success: boolean; deleted_id: string }>(`/drafts/${draftId}`, { method: 'DELETE' }),

  // Publish
  publishNow: (draftId: string) =>
    request<PublishResult>('/publish/now', {
      method: 'POST',
      body: JSON.stringify({ draft_id: draftId }),
    }),

  listPublishResults: () =>
    request<{ items: PublishResult[]; total: number }>('/publish/results'),

  // Schedule
  createSchedule: (draftId: string, platform: string, runAt: string) =>
    request<Schedule>('/schedule', {
      method: 'POST',
      body: JSON.stringify({ draft_id: draftId, platform, run_at: runAt }),
    }),

  listSchedules: () =>
    request<{ items: Schedule[]; total: number }>('/schedule'),

  cancelSchedule: (scheduleId: string) =>
    request<Schedule>(`/schedule/${scheduleId}`, { method: 'DELETE' }),

  // Costs
  getCostRecords: (limit = 200) => request<{ items: CostRecord[]; total: number }>(`/costs?limit=${limit}`),
  getCostSummary: () => request<CostSummary>('/costs/summary'),
}

export function getStatusWsUrl(): string {
  const base = API_BASE.replace(/\/api\/?$/, '')
  return base.replace('http://', 'ws://').replace('https://', 'wss://') + '/ws/status'
}
