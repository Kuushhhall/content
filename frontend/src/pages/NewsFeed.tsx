import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ExternalLink, RefreshCw, Sparkles, X, Trash2,
  Loader2, Flame, Calendar,
  LayoutGrid, List, Search as SearchIcon, ChevronDown,
  FileText, Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

import { api } from '../lib/api';
import type { Article, PaginatedResponse } from '../types';

const TIME_PRESETS = [
  { label: '24h', days: 1 },
  { label: '2 days', days: 2 },
  { label: '3 days', days: 3 },
  { label: '1 week', days: 7 },
];

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Recently';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Recently';
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  } catch {
    return 'Recently';
  }
}

function fmtDate(iso?: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function NewsFeed() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'published_at' | 'virality'>('published_at');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [modalArticle, setModalArticle] = useState<Article | null>(null);

  // Ingest options
  const [ingestOpen, setIngestOpen] = useState(false);
  const [ingestDays, setIngestDays] = useState(1);
  const [ingestQuery, setIngestQuery] = useState('Supreme Court India judgment');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['articles', 'feed'],
    queryFn: () => api.listArticles(1, 100, undefined, sortBy, 'desc', true),
    refetchInterval: 30000,
  });

  const articles = useMemo(() => {
    let items = data?.items ?? [];
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(a =>
        a.title.toLowerCase().includes(q) ||
        a.source.toLowerCase().includes(q) ||
        (a.summary_hint || '').toLowerCase().includes(q)
      );
    }
    if (sortBy === 'virality') {
      items = [...items].sort((a, b) =>
        (b.content_intelligence?.virality_score ?? 0) - (a.content_intelligence?.virality_score ?? 0)
      );
    }
    return items;
  }, [data, search, sortBy]);

  const ingestMut = useMutation({
    mutationFn: () => api.ingest({ days_back: ingestDays, query: ingestQuery }),
    onSuccess: r => {
      toast.success(`Ingested ${r.upserted} new article(s)`);
      qc.invalidateQueries({ queryKey: ['articles'] });
      setIngestOpen(false);
    },
    onError: (e: Error) => toast.error(e.message || 'Ingest failed'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.deleteArticle(id),
    onSuccess: (_, id) => {
      toast.success('Article deleted');
      qc.setQueryData<PaginatedResponse<Article>>(['articles', 'feed'], (old) =>
        old ? { ...old, items: old.items.filter((a) => a.id !== id) } : old
      );
      if (modalArticle?.id === id) setModalArticle(null);
    },
    onError: (e: Error) => toast.error(e.message || 'Delete failed'),
  });

  const fetchContentMut = useMutation({
    mutationFn: (id: string) => api.fetchFullContent(id),
    onSuccess: (data) => {
      toast.success('Full content fetched');
      qc.invalidateQueries({ queryKey: ['articles'] });
      // Update modal article if open
      if (modalArticle?.id === data.article_id) {
        setModalArticle(a => a ? { ...a, full_content: data.full_content, full_content_fetched: true } : a);
      }
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to fetch content'),
  });

  return (
    <div className="flex flex-col h-full bg-gray-950 text-gray-100 min-h-screen">
      {/* Header */}
      <div className="border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white">News Feed</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {articles.length} selected article{articles.length !== 1 ? 's' : ''} ready for content generation
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/news-search')}
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-colors"
            >
              <SearchIcon className="w-4 h-4" /> Search News
            </button>
            <button
              onClick={() => setIngestOpen(v => !v)}
              className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${ingestMut.isPending ? 'animate-spin' : ''}`} />
              Ingest
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Ingest options dropdown */}
        <AnimatePresence>
          {ingestOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3 overflow-hidden"
            >
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <label className="text-xs text-gray-400 mb-1 block">Query</label>
                  <input
                    type="text"
                    value={ingestQuery}
                    onChange={e => setIngestQuery(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Time range</label>
                  <div className="flex gap-1.5">
                    {TIME_PRESETS.map(p => (
                      <button
                        key={p.days}
                        onClick={() => setIngestDays(p.days)}
                        className={`px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                          ingestDays === p.days
                            ? 'bg-violet-600 text-white'
                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setIngestOpen(false)} className="text-sm text-gray-400 hover:text-gray-200 px-3 py-1.5">
                  Cancel
                </button>
                <button
                  onClick={() => ingestMut.mutate()}
                  disabled={ingestMut.isPending}
                  className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-1.5 rounded-lg"
                >
                  {ingestMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  Fetch Articles
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-800/50">
        <div className="flex-1 relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter articles..."
            className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-8 pr-3 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-600"
          />
        </div>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as 'published_at' | 'virality')}
          className="bg-gray-900 border border-gray-800 text-sm text-gray-300 rounded-lg px-2 py-1.5 focus:outline-none"
        >
          <option value="published_at">Latest</option>
          <option value="virality">Virality</option>
        </select>
        <div className="flex items-center gap-1 bg-gray-900 border border-gray-800 rounded-lg p-1">
          <button onClick={() => setViewMode('list')} className={`p-1 rounded transition-colors ${viewMode === 'list' ? 'bg-gray-700 text-white' : 'text-gray-500'}`}>
            <List className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setViewMode('grid')} className={`p-1 rounded transition-colors ${viewMode === 'grid' ? 'bg-gray-700 text-white' : 'text-gray-500'}`}>
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
          </div>
        )}

        {isError && (
          <div className="text-center py-16 text-red-400 text-sm">
            Failed to load articles. Make sure the backend is running.
          </div>
        )}

        {!isLoading && !isError && articles.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <FileText className="w-12 h-12 text-gray-700" />
            <div>
              <p className="text-gray-400 font-medium">No articles in your feed</p>
              <p className="text-gray-600 text-sm mt-1">
                Use <span className="text-violet-400">Search News</span> to find articles and add them here,
                or click <span className="text-violet-400">Ingest</span> to auto-fetch latest legal news.
              </p>
            </div>
            <button
              onClick={() => navigate('/news-search')}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              <SearchIcon className="w-4 h-4" /> Search News
            </button>
          </div>
        )}

        {!isLoading && articles.length > 0 && (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3' : 'space-y-2'}>
            {articles.map(article => (
              <FeedArticleCard
                key={article.id}
                article={article}
                layout={viewMode}
                onClick={() => setModalArticle(article)}
                onDelete={() => deleteMut.mutate(article.id)}
                onGenerate={() => navigate(`/studio?article_id=${article.id}`)}
                isDeleting={deleteMut.isPending && deleteMut.variables === article.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Article Detail Modal */}
      <AnimatePresence>
        {modalArticle && (
          <ArticleModal
            article={modalArticle}
            onClose={() => setModalArticle(null)}
            onGenerate={() => { setModalArticle(null); navigate(`/studio?article_id=${modalArticle.id}`); }}
            onDelete={() => { deleteMut.mutate(modalArticle.id); }}
            onFetchContent={() => fetchContentMut.mutate(modalArticle.id)}
            isFetching={fetchContentMut.isPending}
            isDeleting={deleteMut.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Feed Card ──────────────────────────────────────────────────────────────────

interface FeedCardProps {
  article: Article;
  layout: 'grid' | 'list';
  onClick: () => void;
  onDelete: () => void;
  onGenerate: () => void;
  isDeleting: boolean;
}

const TAG_STYLES: Record<string, string> = {
  hot: 'bg-red-500/20 text-red-400 border-red-500/30',
  breaking: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  landmark: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  recent: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
}

const ArticleTag: React.FC<{ tag: string }> = ({ tag }) => {
  const style = TAG_STYLES[tag] ?? 'bg-gray-700/50 text-gray-400 border-gray-600/30'
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${style}`}>
      {tag}
    </span>
  )
}

const FeedArticleCard: React.FC<FeedCardProps> = ({ article, layout, onClick, onDelete, onGenerate, isDeleting }) => {
  const virality = article.content_intelligence?.virality_score ?? 0;
  const viralityPct = Math.round(virality * 100);

  if (layout === 'list') {
    return (
      <div
        onClick={onClick}
        className="flex items-start gap-3 p-3 rounded-xl border border-gray-800 bg-gray-900/50 hover:border-gray-700 cursor-pointer transition-all group"
      >
        {article.image_url && (
          <img
            src={article.image_url}
            alt=""
            className="w-16 h-12 rounded-lg object-cover shrink-0"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white line-clamp-2 leading-snug">{article.title}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="text-xs text-violet-400 hover:text-violet-300 font-medium flex items-center gap-0.5"
            >
              {article.source} <ExternalLink className="w-2.5 h-2.5" />
            </a>
            <span className="text-xs text-gray-500">{timeAgo(article.published_at)}</span>
            {viralityPct > 0 && (
              <span className="flex items-center gap-0.5 text-xs text-amber-400">
                <Flame className="w-3 h-3" />{viralityPct}%
              </span>
            )}
            {(article.tags ?? []).map(tag => (
              <ArticleTag key={tag} tag={tag} />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
          <button
            onClick={onGenerate}
            className="p-1.5 text-violet-400 hover:bg-violet-500/10 rounded-lg transition-colors"
            title="Generate content"
          >
            <Sparkles className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className="flex flex-col rounded-xl border border-gray-800 bg-gray-900/50 hover:border-gray-700 cursor-pointer transition-all overflow-hidden group"
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
        <p className="text-sm font-medium text-white line-clamp-3 leading-snug">{article.title}</p>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="text-xs text-violet-400 hover:text-violet-300 font-medium flex items-center gap-0.5"
          >
            {article.source} <ExternalLink className="w-2.5 h-2.5" />
          </a>
          <span className="text-xs text-gray-500">{timeAgo(article.published_at)}</span>
          {viralityPct > 0 && (
            <span className="flex items-center gap-0.5 text-xs text-amber-400 ml-auto">
              <Flame className="w-3 h-3" />{viralityPct}%
            </span>
          )}
          {(article.tags ?? []).map(tag => (
            <ArticleTag key={tag} tag={tag} />
          ))}
        </div>
        <div className="flex gap-2 mt-3 pt-2 border-t border-gray-800 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
          <button
            onClick={onGenerate}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 rounded-lg text-xs transition-colors"
          >
            <Sparkles className="w-3 h-3" /> Generate
          </button>
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Article Modal ──────────────────────────────────────────────────────────────

interface ModalProps {
  article: Article;
  onClose: () => void;
  onGenerate: () => void;
  onDelete: () => void;
  onFetchContent: () => void;
  isFetching: boolean;
  isDeleting: boolean;
}

const ArticleModal: React.FC<ModalProps> = ({ article, onClose, onGenerate, onDelete, onFetchContent, isFetching, isDeleting }) => {
  const virality = article.content_intelligence?.virality_score ?? 0;
  const insights = article.content_intelligence?.key_insights ?? [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 10 }}
        onClick={e => e.stopPropagation()}
        className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
      >
        {/* Modal header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-800">
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="text-base font-semibold text-white leading-snug">{article.title}</h2>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-0.5 font-medium"
              >
                {article.source} <ExternalLink className="w-3 h-3" />
              </a>
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {fmtDate(article.published_at)}
              </span>
              {virality > 0 && (
                <span className="text-xs text-amber-400 flex items-center gap-0.5">
                  <Flame className="w-3 h-3" />
                  {Math.round(virality * 100)}% virality
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded-lg shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal body */}
        <div className="flex-1 overflow-auto p-5 space-y-4">
          {article.image_url && (
            <img
              src={article.image_url}
              alt=""
              className="w-full h-48 object-cover rounded-xl"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}

          {insights.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Key Insights</p>
              <ul className="space-y-1">
                {insights.map((insight, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-300">
                    <span className="text-violet-400 shrink-0">•</span>
                    {insight}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                {article.full_content_fetched ? 'Full Content' : 'Preview'}
              </p>
              {!article.full_content_fetched && (
                <button
                  onClick={onFetchContent}
                  disabled={isFetching}
                  className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300"
                >
                  {isFetching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Clock className="w-3 h-3" />}
                  Fetch full content
                </button>
              )}
            </div>
            <div className="bg-gray-800/50 rounded-xl p-4 max-h-64 overflow-auto">
              <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                {article.full_content || article.raw_excerpt || article.summary_hint || 'No content available.'}
              </p>
            </div>
          </div>
        </div>

        {/* Modal footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-800 gap-3">
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
          <div className="flex items-center gap-2">
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4" /> Source
            </a>
            <button
              onClick={onGenerate}
              className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Sparkles className="w-4 h-4" /> Generate Content →
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default NewsFeed;
