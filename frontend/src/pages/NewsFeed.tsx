import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, RefreshCw, Newspaper, Search, Rss, TrendingUp, Scale, Users, Tag } from 'lucide-react'
import toast from 'react-hot-toast'

import { Card } from '../components/Card'
import { Badge } from '../components/Badge'
import { Spinner } from '../components/Spinner'
import { EmptyState } from '../components/EmptyState'
import { SkeletonList } from '../components/Skeleton'
import { api } from '../lib/api'
import { useUIStore } from '../store/uiStore'
import type { Article } from '../types'

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Unknown date'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function viralityColor(score: number): string {
  if (score >= 0.7) return 'text-success'
  if (score >= 0.4) return 'text-amber'
  return 'text-muted-dim'
}

function viralityLabel(score: number): string {
  if (score >= 0.7) return 'High'
  if (score >= 0.4) return 'Medium'
  return 'Low'
}

const kindBadge: Record<string, 'info' | 'amber' | 'muted'> = {
  rss: 'info',
  tavily: 'amber',
  manual: 'muted',
}

export function NewsFeed() {
  const queryClient = useQueryClient()
  const { selectedArticleId, setSelectedArticleId, setTab } = useUIStore()
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data: articles, isLoading } = useQuery({
    queryKey: ['articles'],
    queryFn: api.listArticles,
  })

  const ingestMutation = useMutation({
    mutationFn: api.ingest,
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['articles'] })
      toast.success(`Ingested ${result.upserted} articles`)
    },
    onError: (err) => {
      toast.error(`Ingestion failed: ${(err as Error).message}`)
    },
  })

  const filtered = (articles ?? []).filter(
    (a) =>
      !search ||
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.source.toLowerCase().includes(search.toLowerCase()) ||
      a.content_intelligence?.topic?.toLowerCase().includes(search.toLowerCase()) ||
      a.content_intelligence?.legal_area?.toLowerCase().includes(search.toLowerCase()),
  )

  const selectArticle = (article: Article) => {
    setSelectedArticleId(article.id)
    setTab('studio')
  }

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-dim" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search articles, topics, legal areas..."
            className="input-field pl-10"
          />
        </div>
        <button
          onClick={() => ingestMutation.mutate()}
          disabled={ingestMutation.isPending}
          className="btn-primary"
        >
          {ingestMutation.isPending ? <Spinner size={16} /> : <RefreshCw size={16} />}
          Refresh Sources
        </button>
      </div>

      {/* Article list */}
      {isLoading ? (
        <SkeletonList count={5} />
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={Newspaper}
            title="No articles found"
            description={
              search
                ? 'Try a different search term.'
                : 'Click "Refresh Sources" to ingest legal news from RSS feeds and web sources.'
            }
            action={
              !search ? (
                <button onClick={() => ingestMutation.mutate()} className="btn-secondary text-xs">
                  <Rss size={14} /> Ingest Now
                </button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((article) => {
            const selected = selectedArticleId === article.id
            const expanded = expandedId === article.id
            const ci = article.content_intelligence
            const hasIntelligence = ci && (ci.topic || ci.virality_score > 0)

            return (
              <div
                key={article.id}
                className={`group relative rounded-2xl border p-4 transition-all duration-200 ${
                  selected
                    ? 'border-amber/60 bg-amber/5 shadow-glow-amber'
                    : 'border-stroke/40 bg-panel/50 hover:border-stroke-light hover:bg-panel-hover/60'
                }`}
              >
                {/* Top row */}
                <div className="mb-2.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Badge variant="amber" size="sm">
                      {article.source}
                    </Badge>
                    <Badge variant={kindBadge[article.kind] ?? 'muted'} size="sm">
                      {article.kind}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasIntelligence && ci.virality_score > 0 && (
                      <span
                        className={`flex items-center gap-1 text-[10px] font-semibold ${viralityColor(ci.virality_score)}`}
                        title={`Virality: ${Math.round(ci.virality_score * 100)}%`}
                      >
                        <TrendingUp size={11} />
                        {viralityLabel(ci.virality_score)}
                      </span>
                    )}
                    <span className="text-[11px] text-muted-dim">{timeAgo(article.published_at)}</span>
                  </div>
                </div>

                {/* Title */}
                <button
                  onClick={() => selectArticle(article)}
                  className="mb-2 text-left"
                >
                  <h3 className="text-sm font-semibold leading-snug text-cream group-hover:text-amber-light transition-colors">
                    {article.title}
                  </h3>
                </button>

                {/* Intelligence badges */}
                {hasIntelligence && (
                  <div className="mb-2 flex flex-wrap gap-1">
                    {ci.topic && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-ink/50 px-1.5 py-0.5 text-[10px] text-muted">
                        <Tag size={9} /> {ci.topic}
                      </span>
                    )}
                    {ci.legal_area && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-ink/50 px-1.5 py-0.5 text-[10px] text-muted">
                        <Scale size={9} /> {ci.legal_area}
                      </span>
                    )}
                    {ci.audience?.length > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-ink/50 px-1.5 py-0.5 text-[10px] text-muted">
                        <Users size={9} /> {ci.audience[0]}
                      </span>
                    )}
                    {article.court_name && (
                      <span className="rounded-md bg-ink/50 px-1.5 py-0.5 text-[10px] text-muted">
                        {article.court_name}
                      </span>
                    )}
                  </div>
                )}

                {/* Summary */}
                <p className="line-clamp-2 text-xs leading-relaxed text-muted">
                  {article.structured_summary || article.summary_hint || 'No summary available.'}
                </p>

                {/* Expandable intelligence details */}
                {hasIntelligence && (
                  <button
                    onClick={() => setExpandedId(expanded ? null : article.id)}
                    className="mt-2 text-[11px] font-medium text-amber/70 hover:text-amber transition-colors"
                  >
                    {expanded ? 'Hide details' : 'View insights'}
                  </button>
                )}

                {expanded && hasIntelligence && (
                  <div className="mt-2 space-y-2 rounded-lg border border-stroke/20 bg-ink/30 p-2.5 text-xs animate-fade-in">
                    {ci.key_insights?.length > 0 && (
                      <div>
                        <p className="mb-1 font-semibold text-muted-dim">Key Insights</p>
                        <ul className="space-y-0.5 text-muted">
                          {ci.key_insights.map((insight, i) => (
                            <li key={i}>• {insight}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {ci.suggested_hashtags?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {ci.suggested_hashtags.map((tag) => (
                          <span key={tag} className="rounded bg-amber/10 px-1.5 py-0.5 text-[10px] text-amber">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                    {ci.legal_implications?.length > 0 && (
                      <div>
                        <p className="mb-1 font-semibold text-muted-dim">Implications</p>
                        <ul className="space-y-0.5 text-muted">
                          {ci.legal_implications.slice(0, 3).map((imp, i) => (
                            <li key={i}>• {imp}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Footer */}
                <div className="mt-3 flex items-center justify-between">
                  <button
                    onClick={() => selectArticle(article)}
                    className="text-[11px] font-medium text-amber opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    Select to draft &rarr;
                  </button>
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="rounded-lg p-1.5 text-muted-dim hover:bg-white/5 hover:text-cream transition-colors"
                  >
                    <ExternalLink size={13} />
                  </a>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Count */}
      {!isLoading && filtered.length > 0 && (
        <p className="text-center text-xs text-muted-dim">
          Showing {filtered.length} of {articles?.length ?? 0} articles
        </p>
      )}
    </div>
  )
}
