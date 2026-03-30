import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, CheckCircle, PlusCircle, Loader2, AlertCircle,
  LayoutGrid, List, Flame, Clock, Image as ImageIcon,
  ExternalLink, Filter, ChevronDown, ChevronUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import type { Article } from '../types';

const LEGAL_SOURCES = [
  { id: 'livelaw.in', label: 'LiveLaw' },
  { id: 'barandbench.com', label: 'Bar and Bench' },
  { id: 'scconline.com', label: 'SCC Online' },
  { id: 'indiankanoon.org', label: 'Indian Kanoon' },
  { id: 'thehindu.com', label: 'The Hindu' },
  { id: 'ndtv.com', label: 'NDTV' },
  { id: 'theprint.in', label: 'The Print' },
  { id: 'scroll.in', label: 'Scroll' },
];

const TIME_PRESETS = [
  { label: 'Last 24h', days: 1 },
  { label: '2 Days', days: 2 },
  { label: '3 Days', days: 3 },
  { label: '1 Week', days: 7 },
];

const SUGGESTED_QUERIES = [
  'Supreme Court India judgment',
  'High Court India ruling 2024',
  'Constitutional amendment India',
  'Criminal law India verdict',
  'Property rights India judgment',
  'Bail judgment India',
  'Fundamental rights Supreme Court',
];

const fmtDate = (iso?: string | null) => {
  if (!iso) return 'Unknown date';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

export const NewsSearchPage: React.FC = () => {
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArticles, setSelectedArticles] = useState<Article[]>([]);
  const [searchResults, setSearchResults] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Filters
  const [daysBack, setDaysBack] = useState(1);
  const [includeImages, setIncludeImages] = useState(true);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);

  const hasResults = searchResults.length > 0;
  const hasSelection = selectedArticles.length > 0;

  const toggleSource = (id: string) => {
    setSelectedSources(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) { toast.error('Please enter a search query'); return; }
    setIsLoading(true); setError(null);
    try {
      const result = await api.searchNews(
        searchQuery.trim(),
        20,
        'basic',
        selectedSources.length > 0 ? selectedSources : undefined,
        daysBack,
        includeImages,
      );
      setSearchResults(result.items || []);
      if ((result.items || []).length === 0) {
        toast('No results found. Try a different query or extend the time range.', { icon: '🔍' });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Search failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelect = (article: Article) => {
    setSelectedArticles(prev =>
      prev.find(a => a.id === article.id)
        ? prev.filter(a => a.id !== article.id)
        : [...prev, article]
    );
  };

  const isSelected = (article: Article) =>
    selectedArticles.some(a => a.id === article.id);

  const handleAddToFeed = async () => {
    if (!hasSelection) return;
    try {
      const result = await api.upsertSelected(selectedArticles);
      toast.success(`Added ${result.upserted} article(s) to your News Feed`);
      setSelectedArticles([]);
      navigate('/news');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add articles');
    }
  };

  const selectAll = () => setSelectedArticles([...searchResults]);
  const clearSelection = () => setSelectedArticles([]);

  return (
    <div className="flex flex-col h-full bg-gray-950 text-gray-100 min-h-screen">
      {/* Header */}
      <div className="border-b border-gray-800 px-6 py-4">
        <h1 className="text-xl font-semibold text-white">News Search</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Search Indian legal news, select articles, and add them to your feed
        </p>
      </div>

      <div className="flex-1 overflow-auto px-6 py-4 space-y-4">
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search Indian legal news..."
              className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
            />
          </div>
          <button
            type="button"
            onClick={() => setFiltersOpen(f => !f)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-colors ${
              filtersOpen || selectedSources.length > 0 || daysBack !== 1
                ? 'border-violet-500 bg-violet-500/10 text-violet-300'
                : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-600'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {filtersOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Search
          </button>
        </form>

        {/* Filters Panel */}
        <AnimatePresence>
          {filtersOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-4 overflow-hidden"
            >
              {/* Time Range */}
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Time Range
                </p>
                <div className="flex flex-wrap gap-2">
                  {TIME_PRESETS.map(preset => (
                    <button
                      key={preset.days}
                      type="button"
                      onClick={() => setDaysBack(preset.days)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        daysBack === preset.days
                          ? 'bg-violet-600 text-white'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sources */}
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                  Sources (leave empty for all)
                </p>
                <div className="flex flex-wrap gap-2">
                  {LEGAL_SOURCES.map(src => (
                    <button
                      key={src.id}
                      type="button"
                      onClick={() => toggleSource(src.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        selectedSources.includes(src.id)
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      {src.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Images toggle */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIncludeImages(v => !v)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    includeImages ? 'bg-violet-600' : 'bg-gray-700'
                  }`}
                >
                  <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                    includeImages ? 'translate-x-5' : 'translate-x-1'
                  }`} />
                </button>
                <span className="text-sm text-gray-300 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-gray-400" /> Include images
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Suggested queries */}
        {!hasResults && !isLoading && (
          <div>
            <p className="text-xs text-gray-500 mb-2">Suggested searches:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_QUERIES.map(q => (
                <button
                  key={q}
                  type="button"
                  onClick={() => { setSearchQuery(q); }}
                  className="text-xs bg-gray-900 border border-gray-800 text-gray-400 hover:text-gray-200 hover:border-gray-600 px-3 py-1.5 rounded-full transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 bg-red-900/30 border border-red-800 rounded-lg px-4 py-3 text-sm text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
            <p className="text-sm text-gray-400">Searching legal news...</p>
          </div>
        )}

        {/* Results toolbar */}
        {hasResults && !isLoading && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400">{searchResults.length} results</span>
              <button onClick={selectAll} className="text-xs text-violet-400 hover:text-violet-300">
                Select all
              </button>
              {hasSelection && (
                <button onClick={clearSelection} className="text-xs text-gray-500 hover:text-gray-300">
                  Clear
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded ${viewMode === 'list' ? 'text-white bg-gray-800' : 'text-gray-500'}`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded ${viewMode === 'grid' ? 'text-white bg-gray-800' : 'text-gray-500'}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Results */}
        {hasResults && !isLoading && (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3' : 'space-y-2'}>
            {searchResults.map(article => (
              <ArticleCard
                key={article.id}
                article={article}
                selected={isSelected(article)}
                onToggle={() => toggleSelect(article)}
                layout={viewMode}
              />
            ))}
          </div>
        )}
      </div>

      {/* Floating selection bar */}
      <AnimatePresence>
        {hasSelection && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="flex items-center gap-3 bg-gray-900 border border-gray-700 rounded-2xl px-5 py-3 shadow-xl">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-white font-medium">
                {selectedArticles.length} article{selectedArticles.length > 1 ? 's' : ''} selected
              </span>
              <button
                onClick={clearSelection}
                className="text-xs text-gray-400 hover:text-gray-200 ml-1"
              >
                Clear
              </button>
              <div className="w-px h-4 bg-gray-700" />
              <button
                onClick={handleAddToFeed}
                className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
              >
                <PlusCircle className="w-4 h-4" />
                Add to News Feed
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface ArticleCardProps {
  article: Article;
  selected: boolean;
  onToggle: () => void;
  layout: 'grid' | 'list';
}

const ArticleCard: React.FC<ArticleCardProps> = ({ article, selected, onToggle, layout }) => {
  const virality = article.content_intelligence?.virality_score ?? 0;
  const viralityPct = Math.round(virality * 100);

  if (layout === 'list') {
    return (
      <div
        onClick={onToggle}
        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
          selected
            ? 'border-violet-500 bg-violet-500/5'
            : 'border-gray-800 bg-gray-900/50 hover:border-gray-700'
        }`}
      >
        {/* Checkbox */}
        <div className={`mt-0.5 shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
          selected ? 'border-violet-500 bg-violet-500' : 'border-gray-600'
        }`}>
          {selected && <CheckCircle className="w-3 h-3 text-white fill-white" />}
        </div>

        {/* Thumbnail */}
        {article.image_url && (
          <img
            src={article.image_url}
            alt=""
            className="w-16 h-12 rounded-lg object-cover shrink-0"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white line-clamp-2 leading-snug">{article.title}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs text-violet-400 font-medium">{article.source}</span>
            <span className="text-xs text-gray-500">{fmtDate(article.published_at)}</span>
            {viralityPct > 0 && (
              <span className="flex items-center gap-0.5 text-xs text-amber-400">
                <Flame className="w-3 h-3" />{viralityPct}%
              </span>
            )}
          </div>
          {article.summary_hint && (
            <p className="text-xs text-gray-400 mt-1 line-clamp-2">{article.summary_hint}</p>
          )}
        </div>

        {/* Source link */}
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="shrink-0 p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
          title="Open source"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    );
  }

  return (
    <div
      onClick={onToggle}
      className={`flex flex-col rounded-xl border cursor-pointer transition-all overflow-hidden ${
        selected
          ? 'border-violet-500 bg-violet-500/5'
          : 'border-gray-800 bg-gray-900/50 hover:border-gray-700'
      }`}
    >
      {article.image_url && (
        <img
          src={article.image_url}
          alt=""
          className="w-full h-32 object-cover"
          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      )}
      <div className="p-3 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <p className="text-sm font-medium text-white line-clamp-3 leading-snug flex-1">{article.title}</p>
          <div className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
            selected ? 'border-violet-500 bg-violet-500' : 'border-gray-600'
          }`}>
            {selected && <CheckCircle className="w-3 h-3 text-white fill-white" />}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap mt-auto pt-2">
          <span className="text-xs text-violet-400 font-medium">{article.source}</span>
          <span className="text-xs text-gray-500">{fmtDate(article.published_at)}</span>
          {viralityPct > 0 && (
            <span className="flex items-center gap-0.5 text-xs text-amber-400 ml-auto">
              <Flame className="w-3 h-3" />{viralityPct}%
            </span>
          )}
        </div>
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="mt-2 flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          <ExternalLink className="w-3 h-3" /> View source
        </a>
      </div>
    </div>
  );
};

export default NewsSearchPage;
