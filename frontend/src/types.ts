export type TabKey = 'dashboard' | 'news' | 'studio' | 'scheduler' | 'engagement' | 'analytics'

export type Platform = 'linkedin' | 'x' | 'reddit' | 'framer' | 'medium' | 'instagram'

// Generic paginated response from the new PostgreSQL backend
export type PaginatedResponse<T> = {
  items: T[]
  total: number
  page: number
  page_size: number
  pages: number
}

export type ContentIntelligence = {
  topic: string
  legal_area: string
  audience: string[]
  angle: string
  complexity_level: string
  virality_score: number
  relevance_score: number
  key_insights: string[]
  affected_parties: string[]
  legal_implications: string[]
  suggested_hashtags: string[]
}

export type Article = {
  id: string
  source: string
  title: string
  url: string
  summary_hint: string
  published_at: string | null
  kind: string
  content_intelligence: ContentIntelligence
  structured_summary: string
  full_content: string
  raw_excerpt: string | null
  extracted_facts: string[]
  court_name: string
  case_number: string
  judges_involved: string[]
  parties: string[]
  jurisdiction: string
  precedent_value: string
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
  content_preview?: string // Added for better UI list visibility
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
  pipelineMode: string
  pipelineRunning: boolean
}

// Pipeline types
export type PipelineRun = {
  id: string
  started_at: string
  finished_at: string
  mode: string
  status: string
  articles_ingested: number
  drafts_generated: number
  posts_published: number
  error: string | null
  steps: Array<{ step: string; status: string; at?: string; count?: number; reason?: string }>
}

export type PipelineStatus = {
  mode: string
  current_run: PipelineRun | null
  recent_runs: PipelineRun[]
}

export type BatchDraftResult = {
  article_id: string
  drafts: Draft[]
  errors: string[]
}

export type AutoSelectResult = {
  article_ids: string[]
  articles: Article[]
}

export type EngagementScanResult = {
  total_comments: number
  new_comments: number
  high_intent: number
  high_intent_ids: string[]
}
