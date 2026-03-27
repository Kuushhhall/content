import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, X, Sparkles, ExternalLink, Loader2, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'

import { Badge } from './Badge'
import { Spinner } from './Spinner'
import { ModalPortal } from './ModalPortal'
import { api } from '../lib/api'
import { useUIStore } from '../store/uiStore'
import type { Article } from '../types'

interface SearchNewsModalProps {
  isOpen: boolean
  onClose: () => void
}

const AVAILABLE_SOURCES = [
  'LiveLaw',
  'Bar and Bench',
  'India Legal',
  'Supreme Court',
  'High Courts',
  'TavilySCC'
]

export function SearchNewsModal({ isOpen, onClose }: SearchNewsModalProps) {
  const queryClient = useQueryClient()
  const isDarkMode = useUIStore(state => state.isDarkMode)
  
  const [query, setQuery] = useState('')
  const [maxResults, setMaxResults] = useState(10)
  const [searchDepth, setSearchDepth] = useState<'basic' | 'advanced'>('basic')
  const [selectedSources, setSelectedSources] = useState<string[]>([])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [searchResults, setSearchResults] = useState<Article[]>([])
  const [selectedArticles, setSelectedArticles] = useState<Set<string>>(new Set())
  const [hasSearched, setHasSearched] = useState(false)

  const searchMutation = useMutation({
    mutationFn: () => api.searchNews(query, maxResults, searchDepth, selectedSources, startDate, endDate),
    onSuccess: (data) => {
      setSearchResults(data.items)
      setHasSearched(true)
      setSelectedArticles(new Set())
      toast.success(`Found ${data.total} articles`)
    },
    onError: (err) => {
      toast.error(`Search failed: ${(err as Error).message}`)
    },
  })

  const upsertSelectedMutation = useMutation({
    mutationFn: () => api.upsertSelected(Array.from(selectedArticles).map(id => 
      searchResults.find(a => a.id === id)!
    )),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['articles'] })
      toast.success(`Added ${data.upserted} articles to database`)
      setSelectedArticles(new Set())
      // Close modal after successful add
      setTimeout(() => handleClose(), 500)
    },
    onError: (err) => {
      toast.error(`Failed to add articles: ${(err as Error).message}`)
    },
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) {
      toast.error('Please enter a search query')
      return
    }
    searchMutation.mutate()
  }

  const handleClose = () => {
    setQuery('')
    setSearchResults([])
    setSelectedArticles(new Set())
    setHasSearched(false)
    setSelectedSources([])
    setStartDate('')
    setEndDate('')
    onClose()
  }

  const toggleSource = (source: string) => {
    setSelectedSources(prev => 
      prev.includes(source) 
        ? prev.filter(s => s !== source)
        : [...prev, source]
    )
  }

  const toggleArticleSelection = (articleId: string) => {
    setSelectedArticles(prev => {
      const newSet = new Set(prev)
      if (newSet.has(articleId)) {
        newSet.delete(articleId)
      } else {
        newSet.add(articleId)
      }
      return newSet
    })
  }

  const selectAllArticles = () => {
    if (selectedArticles.size === searchResults.length) {
      setSelectedArticles(new Set())
    } else {
      setSelectedArticles(new Set(searchResults.map(a => a.id)))
    }
  }

  if (!isOpen) return null

  return (
    <ModalPortal>
      <AnimatePresence>
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-void/80 backdrop-blur-3xl"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 40 }}
            className={`relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-[3rem] border transition-all duration-500 shadow-2xl ${
              isDarkMode ? 'border-graphite/40 bg-stellar/40' : 'border-slate-200 bg-white shadow-2xl shadow-slate-900/10'
            }`}
          >
          {/* Modal Header */}
          <div className={`flex items-center justify-between p-8 border-b ${isDarkMode ? 'border-graphite/40 bg-void/40' : 'border-slate-100 bg-slate-50'}`}>
            <div className="flex items-center gap-4">
              <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${isDarkMode ? 'bg-volt/10 text-volt' : 'bg-teal-50 text-teal-600'}`}>
                <Search size={24} />
              </div>
              <div>
                <h4 className={`text-[11px] font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-dim' : 'text-slate-400'}`}>Intelligence Search</h4>
                <p className={`text-xs font-bold ${isDarkMode ? 'text-silver' : 'text-slate-900'}`}>Search for relevant news articles</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className={`p-3 rounded-2xl transition-all ${isDarkMode ? 'text-dim hover:bg-white/5 hover:text-silver' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-900'}`}
            >
              <X size={24} />
            </button>
          </div>

          {/* Modal Body */}
          <div className="overflow-y-auto p-8 max-h-[calc(90vh-200px)] custom-scrollbar">
            {/* Search Form */}
            <form onSubmit={handleSearch} className="space-y-6 mb-8">
              <div>
                <label className={`block text-[10px] font-black uppercase tracking-widest mb-3 ${isDarkMode ? 'text-dim' : 'text-slate-400'}`}>
                  Search Query
                </label>
                <div className="relative">
                  <Search size={20} className={`absolute left-5 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-dim/60' : 'text-slate-400'}`} />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="e.g., Supreme Court judgment, AI regulation, startup funding..."
                    className={`w-full h-14 pl-14 pr-6 rounded-2xl border text-base font-medium transition-all ${
                      isDarkMode 
                        ? 'bg-void/50 border-graphite/40 text-silver placeholder-dim/60 focus:border-volt focus:ring-volt/20' 
                        : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-teal-500 focus:ring-teal-500/20'
                    }`}
                  />
                </div>
              </div>

              {/* Sources Selection */}
              <div>
                <label className={`block text-[10px] font-black uppercase tracking-widest mb-3 ${isDarkMode ? 'text-dim' : 'text-slate-400'}`}>
                  Sources (optional)
                </label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_SOURCES.map((source) => (
                    <button
                      key={source}
                      type="button"
                      onClick={() => toggleSource(source)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        selectedSources.includes(source)
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

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className={`block text-[10px] font-black uppercase tracking-widest mb-3 ${isDarkMode ? 'text-dim' : 'text-slate-400'}`}>
                    Start Date (optional)
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className={`w-full h-14 px-6 rounded-2xl border text-base font-medium transition-all ${
                      isDarkMode 
                        ? 'bg-void/50 border-graphite/40 text-silver focus:border-volt' 
                        : 'bg-white border-slate-200 text-slate-900 focus:border-teal-500'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-[10px] font-black uppercase tracking-widest mb-3 ${isDarkMode ? 'text-dim' : 'text-slate-400'}`}>
                    End Date (optional)
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className={`w-full h-14 px-6 rounded-2xl border text-base font-medium transition-all ${
                      isDarkMode 
                        ? 'bg-void/50 border-graphite/40 text-silver focus:border-volt' 
                        : 'bg-white border-slate-200 text-slate-900 focus:border-teal-500'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className={`block text-[10px] font-black uppercase tracking-widest mb-3 ${isDarkMode ? 'text-dim' : 'text-slate-400'}`}>
                    Max Results
                  </label>
                  <select
                    value={maxResults}
                    onChange={(e) => setMaxResults(Number(e.target.value))}
                    className={`w-full h-14 px-6 rounded-2xl border text-base font-medium transition-all ${
                      isDarkMode 
                        ? 'bg-void/50 border-graphite/40 text-silver focus:border-volt' 
                        : 'bg-white border-slate-200 text-slate-900 focus:border-teal-500'
                    }`}
                  >
                    <option value={5}>5 results</option>
                    <option value={10}>10 results</option>
                    <option value={15}>15 results</option>
                    <option value={20}>20 results</option>
                  </select>
                </div>

                <div>
                  <label className={`block text-[10px] font-black uppercase tracking-widest mb-3 ${isDarkMode ? 'text-dim' : 'text-slate-400'}`}>
                    Search Depth
                  </label>
                  <select
                    value={searchDepth}
                    onChange={(e) => setSearchDepth(e.target.value as 'basic' | 'advanced')}
                    className={`w-full h-14 px-6 rounded-2xl border text-base font-medium transition-all ${
                      isDarkMode 
                        ? 'bg-void/50 border-graphite/40 text-silver focus:border-volt' 
                        : 'bg-white border-slate-200 text-slate-900 focus:border-teal-500'
                    }`}
                  >
                    <option value="basic">Basic (faster)</option>
                    <option value="advanced">Advanced (deeper)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={searchMutation.isPending || !query.trim()}
                className="w-full btn-primary h-14 gap-3"
              >
                {searchMutation.isPending ? (
                  <>
                    <Spinner size={20} />
                    <span>SEARCHING...</span>
                  </>
                ) : (
                  <>
                    <Search size={20} />
                    <span>SEARCH INTELLIGENCE</span>
                  </>
                )}
              </button>
            </form>

            {/* Search Results */}
            {hasSearched && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-1 w-8 rounded-full bg-volt" />
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-volt">
                      Search Results ({searchResults.length})
                    </span>
                  </div>
                  
                  {searchResults.length > 0 && (
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={selectAllArticles}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                          selectedArticles.size === searchResults.length
                            ? 'bg-volt text-ink'
                            : isDarkMode
                              ? 'bg-void/50 border border-graphite/40 text-dim hover:border-volt/30'
                              : 'bg-slate-100 border border-slate-200 text-slate-600 hover:border-teal-300'
                        }`}
                      >
                        {selectedArticles.size === searchResults.length ? 'Deselect All' : 'Select All'}
                      </button>
                      
                      {selectedArticles.size > 0 && (
                        <button
                          type="button"
                          onClick={() => upsertSelectedMutation.mutate()}
                          disabled={upsertSelectedMutation.isPending}
                          className="btn-primary px-6 py-2 gap-2"
                        >
                          {upsertSelectedMutation.isPending ? (
                            <>
                              <Spinner size={16} />
                              <span>Adding...</span>
                            </>
                          ) : (
                            <>
                              <Plus size={16} />
                              <span>Add Selected ({selectedArticles.size})</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {searchResults.length === 0 ? (
                  <div className={`p-8 rounded-2xl border text-center ${isDarkMode ? 'border-graphite/40 bg-void/30' : 'border-slate-200 bg-slate-50'}`}>
                    <p className={`text-sm font-bold ${isDarkMode ? 'text-dim' : 'text-slate-500'}`}>
                      No articles found for "{query}". Try a different search query.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {searchResults.map((article) => (
                      <motion.div
                        key={article.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-6 rounded-2xl border transition-all cursor-pointer ${
                          selectedArticles.has(article.id)
                            ? isDarkMode
                              ? 'border-volt/50 bg-volt/10'
                              : 'border-teal-500 bg-teal-50'
                            : isDarkMode 
                              ? 'border-graphite/40 bg-void/30 hover:border-volt/30' 
                              : 'border-slate-200 bg-white hover:border-teal-300 shadow-sm'
                        }`}
                        onClick={() => toggleArticleSelection(article.id)}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`mt-1 h-5 w-5 rounded border-2 flex items-center justify-center transition-all ${
                            selectedArticles.has(article.id)
                              ? 'bg-volt border-volt'
                              : isDarkMode
                                ? 'border-graphite/60'
                                : 'border-slate-300'
                          }`}>
                            {selectedArticles.has(article.id) && (
                              <svg className="w-3 h-3 text-ink" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-3">
                              <Badge variant="volt" size="sm">{article.kind.toUpperCase()}</Badge>
                              <span className="text-[10px] font-black uppercase tracking-widest text-muted">{article.source}</span>
                            </div>
                            <h4 className={`font-serif text-lg font-bold leading-tight mb-3 line-clamp-2 ${isDarkMode ? 'text-silver' : 'text-slate-900'}`}>
                              {article.title}
                            </h4>
                            <p className={`text-xs leading-relaxed line-clamp-2 ${isDarkMode ? 'text-dim' : 'text-slate-500'}`}>
                              {article.summary_hint || article.structured_summary || 'No summary available'}
                            </p>
                          </div>
                          
                          <a
                            href={article.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className={`p-3 rounded-2xl transition-all shrink-0 ${
                              isDarkMode 
                                ? 'text-dim hover:text-silver hover:bg-white/5' 
                                : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'
                            }`}
                          >
                            <ExternalLink size={18} />
                          </a>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
    </ModalPortal>
  )
}
