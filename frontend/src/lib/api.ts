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
  // Automation
  getAutomationStatus: () =>
    request<{
      cycle_id: string | null;
      started_at: string | null;
      status: string;
      is_paused: boolean;
      queue: Array<{ time: string; platform: string; action: string; title: string | null; draft_id: string | null }>;
      posted: Array<{ draft_id: string; title: string; platform: string; posted_at: string; external_id: string | null; error: string | null }>;
      failed: Array<{ draft_id: string; title: string; platform: string; error: string }>;
      total_drafts: number;
      linkedin_drafts: number;
      framer_drafts: number;
      x_drafts: number;
    }>('/automation/status'),

  startAutomationCycle: () =>
    request<{ success: boolean; cycle_id: string }>('/automation/start-cycle', { method: 'POST' }),

  startAutomationCycleWithCatchup: () =>
    request<{ success: boolean; cycle_id: string }>('/automation/start-cycle-with-catchup', { method: 'POST' }),

  catchUpMissedSchedules: () =>
    request<{ success: boolean; message: string }>('/automation/catch-up', { method: 'POST' }),

  fullReset: () =>
    request<{ success: boolean; message: string }>('/automation/full-reset', { method: 'POST' }),

  fetchNewsAndStart: () =>
    request<{ success: boolean; cycle_id: string; message: string }>('/automation/fetch-and-start', { method: 'POST' }),

  postNowOverride: () =>
    request<{ success: boolean; cycle_id: string; message: string; posts_published: number }>('/automation/post-now', { method: 'POST' }),

  postSpecificDraft: (draftId: string) =>
    request<{ success: boolean; message: string; result: Record<string, unknown> }>(`/automation/post-draft/${draftId}`, { method: 'POST' }),

  pauseAutomationCycle: () =>
    request<{ success: boolean }>('/automation/pause', { method: 'POST' }),

  resumeAutomationCycle: () =>
    request<{ success: boolean }>('/automation/resume', { method: 'POST' }),

  skipAutomationPost: () =>
    request<{ success: boolean; skipped: Record<string, unknown> }>('/automation/skip', { method: 'POST' }),

  retryAutomationPost: (draftId?: string) =>
    request<{ success: boolean }>('/automation/retry', { 
      method: 'POST',
      body: JSON.stringify({ draft_id: draftId }),
    }),

  getDraftContent: (draftId: string) =>
    request<{ success: boolean; draft: { id: string; platform: string; title: string; body: string; article_id: string } }>(`/automation/draft/${draftId}`),

  executeAutomationAction: (time: string, platform: string, action: string) =>
    request<{ success: boolean; error?: string }>('/automation/execute', {
      method: 'POST',
      body: JSON.stringify({ time, platform, action }),
    }),

  getAutomationHistory: () =>
    request<Array<{ cycle_id: string; started_at: string; completed_at: string; posts_published: number; posts_failed: number; platforms: string[] }>>('/automation/history'),

  clearAutomationCycle: () =>
    request<{ success: boolean }>('/automation/clear', { method: 'POST' }),

  getAutomationQueue: () =>
    request<{
      queue: Array<{ time: string; platform: string; action: string; title: string | null; draft_id: string | null }>;
      posted: Array<{ draft_id: string; title: string; platform: string; posted_at: string; external_id: string | null }>;
      failed: Array<{ draft_id: string; title: string; platform: string; error: string }>;
    }>('/automation/queue'),

  // Articles
  listArticles: (page = 1, pageSize = 50) =>
    request<PaginatedResponse<Article>>(`/articles?page=${page}&page_size=${pageSize}`),

  runCycle: () =>
    request<{ cycle_id: string; total_articles: number; top_10_ids: string[]; drafts_created: number; draft_ids: string[]; errors: string[]; timestamp: string; cost_usd: number; cost_inr: number; total_tokens: number }>(
      '/articles/run-cycle',
      { method: 'POST' },
    ),

  getCycleProgress: () =>
    request<{
      cycle_id: string; status: string; started_at: string; finished_at: string;
      step: string; step_detail: string; total_articles: number; articles_fetched: number;
      top_10_ids: string[]; drafts_created: number; errors: string[];
      cycle_cost_usd: number; cycle_cost_inr: number;
    }>('/articles/cycle-progress'),

  getCycleCost: (cycleId: string) =>
    request<{ cycle_id: string; total_usd: number; total_inr: number; total_tokens: number; calls: number; breakdown: CostRecord[] }>(
      `/costs/by-cycle/${cycleId}`,
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
