import { useState, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { 
  ExternalLink, 
  RefreshCw, 
  Newspaper, 
  Search, 
  TrendingUp, 
  Tag, 
  ArrowUpRight, 
  Sparkles,
  X,
  Maximize2,
  Calendar,
  Globe,
  Trash2,
  ArrowUpDown,
  Filter
} from 'lucide-react'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

import { Card } from '../components/Card'
import { Badge } from '../components/Badge'
import { Spinner } from '../components/Spinner'
import { EmptyState } from '../components/EmptyState'
import { SkeletonList } from '../components/Skeleton'
import { SearchNewsModal } from '../components/SearchNewsModal'
import { ModalPortal } from '../components/ModalPortal'
import { api } from '../lib/api'
import { useUIStore } from '../store/uiStore'
import type { Article } from '../types'

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Recently fetched'
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return 'Recently fetched'
    
    const diff = Date.now() - date.getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    if (days < 7) return `${days}d ago`
    if (days < 30) return `${Math.floor(days / 7)}w ago`
    return `${Math.floor(days / 30)}mo ago`
  } catch {
    return 'Recently fetched'
  }
}

const kindBadge: Record<string, string> = {
  rss: 'bg-info/10 text-info border-info/20',
  tavily: 'bg-volt/10 text-volt border-volt/20',
  manual: 'bg-graphite/20 text-dim border-graphite/20',
}

export function NewsFeed() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isDarkMode = useUIStore(state => state.isDarkMode)
  const { selectedArticleId, setSelectedArticleId } = useUIStore()
  
  const [search, setSearch] = useState('')
  const [modalArticle, setModalArticle] = useState<Article | null>(null)
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false)
  const [sortBy, setSortBy] = useState<'date' | 'virality' | 'source'>('date')
  const [filterSource, setFilterSource] = useState<string>('')

  const { data: articles, isLoading } = useQuery({
    queryKey: ['articles'],
    queryFn: () => api.listArticles(),
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

  const deleteMutation = useMutation({
    mutationFn: api.deleteArticle,
    onSuccess: (_, articleId) => {
      queryClient.invalidateQueries({ queryKey: ['articles'] })
      toast.success('Article deleted successfully')
      // Close modal if the deleted article was being viewed
      if (modalArticle?.id === articleId) {
        setModalArticle(null)
      }
    },
    onError: (err) => {
      toast.error(`Delete failed: ${(err as Error).message}`)
    },
  })

  const handleDelete = (articleId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    deleteMutation.mutate(articleId)
  }

  const filtered = useMemo(() => {
    let items = (articles?.items ?? []).filter(
      (a) =>
        (!search ||
          a.title.toLowerCase().includes(search.toLowerCase()) ||
          a.source.toLowerCase().includes(search.toLowerCase()) ||
          a.content_intelligence?.topic?.toLowerCase().includes(search.toLowerCase()) ||
          a.content_intelligence?.legal_area?.toLowerCase().includes(search.toLowerCase())) &&
        (!filterSource || a.source === filterSource)
    )

    // Sort items
    items = [...items].sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.published_at || 0).getTime() - new Date(a.published_at || 0).getTime()
      } else if (sortBy === 'virality') {
        return (b.content_intelligence?.virality_score || 0) - (a.content_intelligence?.virality_score || 0)
      } else {
        return a.source.localeCompare(b.source)
      }
    })

    return items
  }, [articles?.items, search, sortBy, filterSource])

  const uniqueSources = useMemo(() => {
    const sources = new Set((articles?.items ?? []).map(a => a.source))
    return Array.from(sources).sort()
  }, [articles?.items])

  const selectArticle = (article: Article) => {
    setSelectedArticleId(article.id)
    navigate('/studio')
  }

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Search Header */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="relative flex-1 min-w-[300px] max-w-xl group">
            <Search size={20} className={`absolute left-5 top-1/2 -translate-y-1/2 transition-colors duration-300 ${isDarkMode ? 'text-dim/60 group-focus-within:text-volt' : 'text-slate-400 group-focus-within:text-teal-600'}`} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search News from the database..."
              className="input-field h-14 pl-14 pr-6 text-base font-medium"
            />
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSearchModalOpen(true)}
              className={`h-14 px-8 gap-3 rounded-2xl border text-[11px] font-black uppercase tracking-widest transition-all ${
                isDarkMode 
                  ? 'border-graphite/40 bg-stellar/20 text-silver hover:bg-white/5 hover:border-volt/30' 
                  : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:border-teal-300 shadow-sm'
              }`}
            >
              <Search size={16} />
              <span>Search for Latest News</span>
            </button>
          </div>
        </div>

        {/* Filters and Sort */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <ArrowUpDown size={16} className={isDarkMode ? 'text-dim' : 'text-slate-400'} />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'virality' | 'source')}
              className={`h-10 px-4 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all ${
                isDarkMode 
                  ? 'bg-void/50 border-graphite/40 text-silver focus:border-volt' 
                  : 'bg-white border-slate-200 text-slate-900 focus:border-teal-500'
              }`}
            >
              <option value="date">Sort by Date</option>
              <option value="virality">Sort by Virality</option>
              <option value="source">Sort by Source</option>
            </select>
          </div>

          {/* Source Filter Chips */}
          <div className="flex items-center gap-2">
            <Filter size={16} className={isDarkMode ? 'text-dim' : 'text-slate-400'} />
            <button
              onClick={() => setFilterSource('')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                !filterSource
                  ? 'bg-volt text-ink'
                  : isDarkMode
                    ? 'bg-void/50 border border-graphite/40 text-dim hover:border-volt/30'
                    : 'bg-slate-100 border border-slate-200 text-slate-600 hover:border-teal-300'
              }`}
            >
              All
            </button>
            {uniqueSources.slice(0, 5).map((source) => (
              <button
                key={source}
                onClick={() => setFilterSource(source)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  filterSource === source
                    ? 'bg-volt text-ink'
                    : isDarkMode
                      ? 'bg-void/50 border border-graphite/40 text-dim hover:border-volt/30'
                      : 'bg-slate-100 border border-slate-200 text-slate-600 hover:border-teal-300'
                }`}
              >
                {source}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <SkeletonList count={6} />
      ) : filtered.length === 0 ? (
        <Card className="py-32 flex flex-col items-center justify-center border-dashed">
          <EmptyState
            icon={Newspaper}
            title={search ? "Signal Fragmented" : "Registry Empty"}
            description={search ? `No intelligence logs match "${search}". Try alternative search vectors.` : 'Intelligence ingestion required to begin workflow.'}
          />
        </Card>
      ) : (
        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((article, index) => {
            const selected = selectedArticleId === article.id
            const ci = article.content_intelligence
            const isViral = ci && ci.virality_score >= 0.4

            return (
              <motion.div
                layout
                key={article.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`group relative flex flex-col rounded-[2.5rem] border transition-all duration-500 overflow-hidden ${
                  selected
                    ? 'border-volt bg-volt/5 shadow-glow-volt/10 ring-2 ring-volt/10'
                    : isDarkMode 
                      ? 'border-graphite/40 bg-stellar/10 hover:border-volt/30' 
                      : 'border-slate-200 bg-white hover:border-teal-300 shadow-xl shadow-slate-200/30'
                }`}
              >
                <div className="p-8 flex-1">
                  <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <span className="text-[10px] font-black text-volt">#{index + 1}</span>
                       <div className={`rounded-xl px-3 py-1 text-[9px] font-black uppercase tracking-widest border ${kindBadge[article.kind] || 'bg-graphite/20 text-dim border-graphite/40'}`}>
                        {article.kind}
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted">{article.source}</span>
                    </div>
                    <span className="text-[10px] font-bold text-muted/60">{timeAgo(article.published_at)}</span>
                  </div>

                  <h3 className={`mb-4 font-serif text-xl font-bold leading-tight transition-colors text-main group-hover:text-volt line-clamp-2`}>
                    {article.title}
                  </h3>

                  {ci && (
                    <div className="mb-6 flex flex-wrap gap-2">
                       {ci.topic && (
                        <div className={`flex items-center gap-2 rounded-[10px] px-3 py-1.5 text-[10px] font-bold border ${isDarkMode ? 'bg-void/50 border-graphite/40 text-dim' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                          <Tag size={12} className="text-volt" /> {ci.topic}
                        </div>
                      )}
                      {isViral && (
                        <div className="flex items-center gap-2 rounded-[10px] bg-success/10 px-3 py-1.5 text-[10px] font-black text-success border border-success/20">
                          <TrendingUp size={12} /> HOT
                        </div>
                      )}
                    </div>
                  )}

                  <p className="line-clamp-3 text-xs leading-relaxed transition-colors text-muted">
                    {article.structured_summary || article.summary_hint || 'Loading summary...'}
                  </p>
                </div>

                {/* Tactical Footer */}
                <div className={`mt-auto border-t p-6 flex items-center justify-between transition-colors ${
                  isDarkMode ? 'border-graphite/40 bg-void/30' : 'border-slate-100 bg-slate-50/70'
                }`}>
                  <button
                    onClick={() => selectArticle(article)}
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all text-volt hover:translate-x-1 group/launch"
                  >
                    <span>Initiate Draft</span>
                    <ArrowUpRight size={14} className="mb-0.5 group-hover/launch:-translate-y-0.5 group-hover/launch:translate-x-0.5 transition-transform" />
                  </button>
                  
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setModalArticle(article)}
                      className={`p-3 rounded-2xl transition-all ${
                        isDarkMode ? 'text-dim hover:text-silver hover:bg-white/5' : 'text-slate-400 hover:text-slate-900 hover:bg-white shadow-sm border border-slate-100'
                      }`}
                      title="Analyze full report"
                    >
                      <Maximize2 size={18} />
                    </button>
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`p-3 rounded-2xl transition-all ${
                         isDarkMode ? 'text-dim hover:text-silver hover:bg-white/5' : 'text-slate-400 hover:text-slate-900 hover:bg-white shadow-sm border border-slate-100'
                      }`}
                    >
                      <ExternalLink size={18} />
                    </a>
                    <button
                      onClick={(e) => handleDelete(article.id, e)}
                      disabled={deleteMutation.isPending}
                      className={`p-3 rounded-2xl transition-all ${
                        isDarkMode 
                          ? 'text-dim hover:text-danger hover:bg-danger/10' 
                          : 'text-slate-400 hover:text-red-600 hover:bg-red-50 shadow-sm border border-slate-100'
                      }`}
                      title="Delete article"
                    >
                      {deleteMutation.isPending ? <Spinner size={18} /> : <Trash2 size={18} />}
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Intelligence Modal */}
      <AnimatePresence>
        {modalArticle && (
          <ModalPortal>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setModalArticle(null)}
                className="absolute inset-0 bg-void/80 backdrop-blur-3xl"
              />
              
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 40 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 40 }}
                className={`relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-[3rem] border transition-all duration-500 shadow-2xl ${
                  isDarkMode ? 'border-graphite/40 bg-stellar/40' : 'border-slate-200 bg-white shadow-2xl shadow-slate-900/10'
                }`}
              >
              {/* Modal Header */}
              <div className={`flex items-center justify-between p-8 border-b ${isDarkMode ? 'border-graphite/40 bg-void/40' : 'border-slate-100 bg-slate-50'}`}>
                <div className="flex items-center gap-4">
                  <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${isDarkMode ? 'bg-volt/10 text-volt' : 'bg-teal-50 text-teal-600'}`}>
                    <Sparkles size={24} />
                  </div>
                  <div>
                    <h4 className={`text-[11px] font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-dim' : 'text-slate-400'}`}>Article Details</h4>
                    <p className={`text-xs font-bold ${isDarkMode ? 'text-silver' : 'text-slate-900'}`}>{modalArticle.source} • {modalArticle.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setModalArticle(null)}
                  className={`p-3 rounded-2xl transition-all ${isDarkMode ? 'text-dim hover:bg-white/5 hover:text-silver' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-900'}`}
                >
                  <X size={24} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="overflow-y-auto p-10 max-h-[calc(90vh-100px)] custom-scrollbar">
                <div className="flex flex-wrap gap-4 mb-8">
                  <Badge variant="volt" size="md">{modalArticle.kind.toUpperCase()}</Badge>
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-graphite/20 bg-void/30 text-xs font-bold text-muted">
                    <Calendar size={14} className="text-amethyst" /> 
                    {modalArticle.published_at 
                      ? new Date(modalArticle.published_at).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        })
                      : 'Recently fetched'
                    }
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-graphite/20 bg-void/30 text-xs font-bold text-muted">
                    <Globe size={14} className="text-volt" /> {modalArticle.source}
                  </div>
                </div>

                <h2 className="text-3xl md:text-4xl font-serif font-bold leading-tight mb-8 text-main">
                  {modalArticle.title}
                </h2>

                <div className="grid gap-10 md:grid-cols-3">
                  <div className="md:col-span-2 space-y-10">
                    {/* Executive Summary */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                         <div className="h-1 w-8 rounded-full bg-volt" />
                         <span className="text-[11px] font-black uppercase tracking-[0.2em] text-volt">Summary</span>
                      </div>
                      <p className="text-lg leading-relaxed text-muted font-medium">
                        {modalArticle.structured_summary || modalArticle.summary_hint || "Summary analysis in progress..."}
                      </p>
                    </div>

                    {/* Full Analysis / Body */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className={`h-1 w-8 rounded-full ${modalArticle.full_content ? 'bg-amethyst' : 'bg-dim/20'}`} />
                          <span className={`text-[11px] font-black uppercase tracking-[0.2em] ${modalArticle.full_content ? 'text-amethyst' : 'text-muted'}`}>
                            {modalArticle.full_content ? 'Full Article' : 'Summary'}
                          </span>
                        </div>
                        <div className={`prose max-w-none transition-colors duration-500 ${isDarkMode ? 'prose-invert' : 'prose-slate'}`}>
                          <p className="text-base leading-relaxed text-muted whitespace-pre-wrap">
                            {modalArticle.full_content || modalArticle.structured_summary || modalArticle.summary_hint || "Deep intelligence scan pending for this entry."}
                          </p>
                        </div>
                    </div>
                  </div>

                  {/* Sidebar stats/insights */}
                  <div className="space-y-8">
                    {/* AI Insights Card */}
                    <div className={`p-6 rounded-[2rem] border ${isDarkMode ? 'bg-stellar/20 border-graphite/40' : 'bg-slate-50 border-slate-200'}`}>
                      <h5 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-volt mb-6">
                        <TrendingUp size={14} /> Metrics
                      </h5>
                      <div className="space-y-6">
                        <div>
                          <p className="text-[10px] font-bold text-muted mb-1 uppercase">Virality Score</p>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-1.5 rounded-full bg-graphite/20 overflow-hidden">
                               <motion.div 
                                 initial={{ width: 0 }}
                                 animate={{ width: `${(modalArticle.content_intelligence?.virality_score || 0.1) * 100}%` }}
                                 className="h-full bg-success shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
                               />
                            </div>
                            <span className="text-xs font-black text-main">{Math.round((modalArticle.content_intelligence?.virality_score || 0) * 100)}%</span>
                          </div>
                        </div>
                        
                        <div>
                          <p className="text-[10px] font-bold text-muted mb-3 uppercase">Key Insights</p>
                          <div className="space-y-3">
                            {modalArticle.content_intelligence?.key_insights?.map((ins, i) => (
                              <div key={i} className="flex gap-3 text-xs leading-relaxed text-muted">
                                <div className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-volt" />
                                <span>{ins}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Block */}
                    <div className="space-y-3">
                       <button
                         onClick={() => {
                           selectArticle(modalArticle)
                           setModalArticle(null)
                         }}
                         className="w-full btn-primary h-14"
                       >
                         <Sparkles size={18} /> Create Draft
                       </button>
                       <a
                         href={modalArticle.url}
                         target="_blank"
                         rel="noopener noreferrer"
                         className={`flex items-center justify-center gap-2 w-full h-14 rounded-2xl border text-[11px] font-black uppercase tracking-widest transition-all ${
                           isDarkMode ? 'border-graphite/40 bg-stellar/20 text-silver hover:bg-white/5' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                         }`}
                       >
                         <ExternalLink size={18} /> View Source
                       </a>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
          </ModalPortal>
        )}
      </AnimatePresence>

      {/* Search News Modal */}
      <SearchNewsModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
      />
    </div>
  )
}
