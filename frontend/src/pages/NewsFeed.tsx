import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, RefreshCw, Newspaper, Search, TrendingUp, Scale, Tag, ArrowUpRight, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

import { Card } from '../components/Card'
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

const kindBadge: Record<string, string> = {
  rss: 'bg-info/10 text-info border-info/20',
  tavily: 'bg-volt/10 text-volt border-volt/20',
  manual: 'bg-graphite/20 text-dim border-graphite/20',
}

export function NewsFeed() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { selectedArticleId, setSelectedArticleId } = useUIStore()
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data: articles, isLoading } = useQuery({
    queryKey: ['articles'],
    queryFn: api.listArticles,
  })

  const ingestMutation = useMutation({
    mutationFn: api.ingest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drafts'] })
      navigate('/studio')
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
    navigate('/studio')
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Search & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[280px] max-w-md">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-dim" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Lawxy database..."
            className="input-field pl-12 h-12"
          />
        </div>
        <button
          onClick={() => ingestMutation.mutate()}
          disabled={ingestMutation.isPending}
          className="btn-primary h-12 px-6 shadow-glow-volt/20"
        >
          {ingestMutation.isPending ? <Spinner size={18} /> : <RefreshCw size={18} />}
          <span>Refresh Intelligence</span>
        </button>
      </div>

      {isLoading ? (
        <SkeletonList count={6} />
      ) : filtered.length === 0 ? (
        <Card className="py-20">
          <EmptyState
            icon={Newspaper}
            title="No intelligence found"
            description={search ? 'Refine your search parameters.' : 'Connect sources to begin ingestion.'}
          />
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((article) => {
            const selected = selectedArticleId === article.id
            const expanded = expandedId === article.id
            const ci = article.content_intelligence
            const isViral = ci && ci.virality_score >= 0.4

            return (
              <motion.div
                layout
                key={article.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`group relative flex flex-col rounded-[1.5rem] border transition-all duration-300 ${
                  selected
                    ? 'border-volt/50 bg-volt/5 shadow-glow-volt'
                    : 'border-graphite/40 bg-stellar/40 hover:border-volt/30 hover:bg-stellar/60 hover:shadow-card-hover'
                }`}
              >
                {/* Header */}
                <div className="p-5 flex-1">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <div className={`rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider border ${kindBadge[article.kind]}`}>
                        {article.kind}
                      </div>
                      <span className="text-[11px] font-bold text-dim">{article.source}</span>
                    </div>
                    <span className="text-[10px] font-medium text-dim/60">{timeAgo(article.published_at)}</span>
                  </div>

                  <h3 className="mb-3 font-serif text-lg font-bold leading-tight text-silver group-hover:text-volt transition-colors line-clamp-2">
                    {article.title}
                  </h3>

                  {/* AI Tags */}
                  {ci && (
                    <div className="mb-4 flex flex-wrap gap-1.5">
                      {ci.topic && (
                        <div className="flex items-center gap-1 rounded-lg bg-void/50 px-2 py-1 text-[10px] font-bold text-dim border border-graphite/20">
                          <Tag size={10} className="text-volt" /> {ci.topic}
                        </div>
                      )}
                      {ci.legal_area && (
                        <div className="flex items-center gap-1 rounded-lg bg-void/50 px-2 py-1 text-[10px] font-bold text-dim border border-graphite/20">
                          <Scale size={10} className="text-amethyst" /> {ci.legal_area}
                        </div>
                      )}
                      {isViral && (
                        <div className="flex items-center gap-1 rounded-lg bg-success/10 px-2 py-1 text-[10px] font-black text-success border border-success/20">
                          <TrendingUp size={10} /> HOT
                        </div>
                      )}
                    </div>
                  )}

                  <p className="line-clamp-3 text-xs leading-relaxed text-dim/80">
                    {article.structured_summary || article.summary_hint || 'Aggregating intelligence details...'}
                  </p>

                  <AnimatePresence>
                    {expanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-4 space-y-4 pt-4 border-t border-graphite/20 overflow-hidden"
                      >
                        {ci?.key_insights && ci.key_insights.length > 0 && (
                          <div>
                            <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-volt/70">Key Insights</p>
                            <ul className="space-y-2">
                              {ci.key_insights.map((ins, i) => (
                                <li key={i} className="flex gap-2 text-[11px] text-silver/80">
                                  <span className="text-volt select-none">•</span>
                                  {ins}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Footer Actions */}
                <div className="mt-auto border-t border-graphite/20 p-4 flex items-center justify-between bg-stellar/20 rounded-b-[1.5rem]">
                  <button
                    onClick={() => selectArticle(article)}
                    className="group/btn flex items-center gap-1.5 text-xs font-bold text-volt"
                  >
                    <span>Draft for Platform</span>
                    <ArrowUpRight size={14} className="transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
                  </button>
                  
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setExpandedId(expanded ? null : article.id)}
                      className={`p-2 rounded-xl transition-colors ${expanded ? 'bg-volt/10 text-volt' : 'text-dim hover:text-silver hover:bg-white/5'}`}
                    >
                      <Sparkles size={16} />
                    </button>
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl text-dim hover:text-silver hover:bg-white/5 transition-colors"
                    >
                      <ExternalLink size={16} />
                    </a>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
