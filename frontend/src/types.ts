export type TabKey = 'news' | 'studio' | 'scheduler' | 'engagement' | 'analytics'

export type Article = {
  id: string
  source: string
  title: string
  url: string
  summary_hint: string
  published_at: string | null
  kind: string
}

export type Draft = {
  id: string
  article_id: string
  platform: string
  body: string
  summary: string | null
}

export type Schedule = {
  id: string
  draft_id: string
  platform: string
  run_at: string
  status: string
  error: string | null
}

export type PublishResult = {
  platform: string
  success: boolean
  external_id: string | null
  message: string | null
  at: string
}

export type EngagementComment = {
  id: string
  platform: string
  author: string
  text: string
  source_post_id: string | null
  created_at: string
  status: string
  ai_suggested_reply: string | null
}

export type AnalyticsOverview = {
  total_posts: number
  success_posts: number
  failed_posts: number
  success_rate: number
  by_platform: Record<string, number>
}

export type StatusFeed = {
  at: string
  articles: number
  drafts: number
  pendingSchedules: number
  recentPublishes: number
  autoReplyEnabled: boolean
}
