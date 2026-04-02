export type Platform = 'linkedin' | 'x' | 'framer'

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
  selected: boolean
  image_url: string | null
  full_content_fetched: boolean
  tags: string[]
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

export type CostRecord = {
  id: string
  at: string
  pipeline_run_id: string
  api: string
  model: string
  call_type: string
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  cost_usd: number
  cost_inr: number
}

export type CostSummary = {
  total_usd: number
  total_inr: number
  total_calls: number
  by_api: Record<string, { cost_usd: number; cost_inr: number; calls: number }>
  by_model: Record<string, { cost_usd: number; cost_inr: number; calls: number }>
}

export type StatusFeed = {
  at: string
  articles: number
  drafts: number
  pendingSchedules: number
  recentPublishes: number
}
