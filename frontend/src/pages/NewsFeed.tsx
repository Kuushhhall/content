import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ExternalLink, Trash2,
  Loader2, Flame, Calendar,
  LayoutGrid, List, Search as SearchIcon,
  FileText, Sparkles, Square, CheckSquare,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

import { api } from '../lib/api';
import { useUIStore } from '../store/uiStore';
import type { Article } from '../types';

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

export function NewsFeed() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isDarkMode = useUIStore((s) => s.isDarkMode);

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'published_at' | 'virality'>('published_at');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [modalArticle, setModalArticle] = useState<Article | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data, isLoading, isError } = useQuery({
    queryKey: ['articles', sortBy],
    queryFn: () => api.listArticles(1, 200),
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
      items = [...items].sort((a: Article, b: Article) =>
        (b.content_intelligence?.virality_score ?? 0) - (a.content_intelligence?.virality_score ?? 0)
      );
    }
    return items;
  }, [data, search, sortBy]);

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.deleteArticle(id),
    onSuccess: (_, id) => {
      toast.success('Article deleted');
      qc.invalidateQueries({ queryKey: ['articles'] });
      if (modalArticle?.id === id) setModalArticle(null);
    },
    onError: (e: Error) => toast.error(e.message || 'Delete failed'),
  });

  const deleteSelectedMut = useMutation({
    mutationFn: async () => {
      const ids = Array.from(selectedIds);
      await Promise.all(ids.map(id => api.deleteArticle(id)));
      return ids.length;
    },
    onSuccess: (count) => {
      toast.success(`${count} article${count > 1 ? 's' : ''} deleted`);
      setSelectedIds(new Set());
      qc.invalidateQueries({ queryKey: ['articles'] });
    },
    onError: (err) => toast.error((err as Error).message),
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === articles.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(articles.map(a => a.id)));
    }
  };

  return (
    <div className={`flex flex-col h-full min-h-screen ${isDarkMode ? 'bg-void text-silver' : 'bg-cream text-ink'}`}>
      {/* Header */}
      <div className={`border-b px-6 py-4 ${isDarkMode ? 'border-graphite/40' : 'border-graphite/20'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-xl font-bold ${isDarkMode ? 'text-silver' : 'text-ink'}`}>News Feed</h1>
            <p className="text-sm text-muted mt-0.5">
              {articles.length} article{articles.length !== 1 ? 's' : ''} — run a content cycle from Dashboard to generate drafts
            </p>
          </div>
          <div className="flex items-center gap-3">
            {selectedIds.size > 0 && (
              <button
                onClick={() => deleteSelectedMut.mutate()}
                disabled={deleteSelectedMut.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-danger/10 text-danger border border-danger/30 rounded-xl text-sm font-bold hover:bg-danger hover:text-white transition-all"
              >
                {deleteSelectedMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Delete {selectedIds.size}
              </button>
            )}
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-1.5 px-3 py-2 bg-volt hover:bg-volt/90 text-void rounded-xl text-sm font-bold transition-colors"
            >
              <Sparkles className="w-4 h-4" /> Run Content Cycle
            </button>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className={`flex items-center gap-3 px-6 py-3 border-b ${isDarkMode ? 'border-graphite/40' : 'border-graphite/20'}`}>
        <div className="flex-1 relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-dim" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter articles..."
            className={`w-full border rounded-xl pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:border-volt/50 transition-colors ${
              isDarkMode
                ? 'bg-graphite/20 border-graphite/40 text-silver placeholder-dim'
                : 'bg-white border-graphite/20 text-ink placeholder-dim'
            }`}
          />
        </div>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as 'published_at' | 'virality')}
          className={`border text-sm rounded-xl px-2 py-1.5 focus:outline-none ${
            isDarkMode ? 'bg-graphite/20 border-graphite/40 text-dim' : 'bg-white border-graphite/20 text-muted'
          }`}
        >
          <option value="published_at">Latest</option>
          <option value="virality">Virality</option>
        </select>
        <div className={`flex items-center gap-1 border rounded-xl p-1 ${isDarkMode ? 'bg-graphite/20 border-graphite/40' : 'bg-white border-graphite/20'}`}>
          <button onClick={() => setViewMode('list')} className={`p-1 rounded-lg transition-colors ${viewMode === 'list' ? isDarkMode ? 'bg-graphite/60 text-silver' : 'bg-stellar/50 text-ink' : 'text-dim'}`}>
            <List className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setViewMode('grid')} className={`p-1 rounded-lg transition-colors ${viewMode === 'grid' ? isDarkMode ? 'bg-graphite/60 text-silver' : 'bg-stellar/50 text-ink' : 'text-dim'}`}>
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
        </div>
        {articles.length > 0 && (
          <button
            onClick={selectAll}
            className={`flex items-center gap-2 px-3 py-1.5 border rounded-xl text-sm font-bold transition-colors ${
              isDarkMode ? 'bg-graphite/20 border-graphite/40 text-dim hover:text-silver' : 'bg-white border-graphite/20 text-muted hover:text-ink'
            }`}
          >
            {selectedIds.size === articles.length ? <CheckSquare className="w-4 h-4 text-volt" /> : <Square className="w-4 h-4" />}
            {selectedIds.size === articles.length ? 'Deselect All' : 'Select All'}
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-volt" />
          </div>
        )}

        {isError && (
          <div className="text-center py-16 text-danger text-sm">
            Failed to load articles. Make sure the backend is running.
          </div>
        )}

        {!isLoading && !isError && articles.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <FileText className="w-12 h-12 text-dim" />
            <div>
              <p className="text-muted font-medium">No articles yet</p>
              <p className="text-dim text-sm mt-1">
                Go to Dashboard and click <span className="text-volt font-bold">Run Content Cycle</span> to fetch and rank articles.
              </p>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 bg-volt hover:bg-volt/90 text-void px-4 py-2 rounded-xl text-sm font-bold"
            >
              <Sparkles className="w-4 h-4" /> Go to Dashboard
            </button>
          </div>
        )}

        {!isLoading && articles.length > 0 && (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3' : 'space-y-2'}>
            {articles.map((article: Article) => (
              <FeedArticleCard
                key={article.id}
                article={article}
                layout={viewMode}
                selected={selectedIds.has(article.id)}
                onSelect={() => toggleSelect(article.id)}
                onClick={() => setModalArticle(article)}
                onDelete={() => deleteMut.mutate(article.id)}
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
            onDelete={() => { deleteMut.mutate(modalArticle.id); }}
            isDeleting={deleteMut.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

const TAG_STYLES: Record<string, string> = {
  hot: 'bg-danger/20 text-danger border-danger/30',
  breaking: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  landmark: 'bg-amethyst/20 text-amethyst border-amethyst/30',
  recent: 'bg-success/20 text-success border-success/30',
}

const ArticleTag: React.FC<{ tag: string }> = ({ tag }) => {
  const style = TAG_STYLES[tag] ?? 'bg-graphite/20 text-dim border-graphite/30'
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${style}`}>
      {tag}
    </span>
  )
}

interface FeedCardProps {
  article: Article;
  layout: 'grid' | 'list';
  selected: boolean;
  onSelect: () => void;
  onClick: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}

const FeedArticleCard: React.FC<FeedCardProps> = ({ article, layout, selected, onSelect, onClick, onDelete, isDeleting }) => {
  const isDarkMode = useUIStore((s) => s.isDarkMode);
  const virality = article.content_intelligence?.virality_score ?? 0;
  const viralityPct = Math.round(virality * 100);

  const cardBase = `transition-all group cursor-pointer rounded-xl border ${
    selected
      ? 'border-volt/50 bg-volt/5'
      : isDarkMode
        ? 'border-graphite/40 bg-graphite/10 hover:border-graphite/60'
        : 'border-graphite/20 bg-white hover:border-graphite/40'
  }`

  if (layout === 'list') {
    return (
      <div onClick={onClick} className={`flex items-start gap-3 p-3 ${cardBase}`}>
        <button
          onClick={e => { e.stopPropagation(); onSelect(); }}
          className="p-1 rounded hover:bg-white/10 transition-colors shrink-0 mt-1"
        >
          {selected ? <CheckSquare size={18} className="text-volt" /> : <Square size={18} className="text-dim" />}
        </button>
        {article.image_url && (
          <img
            src={article.image_url}
            alt=""
            className="w-16 h-12 rounded-lg object-cover shrink-0"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        )}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium line-clamp-2 leading-snug ${isDarkMode ? 'text-silver' : 'text-ink'}`}>{article.title}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="text-xs text-volt hover:text-volt/80 font-medium flex items-center gap-0.5"
            >
              {article.source} <ExternalLink className="w-2.5 h-2.5" />
            </a>
            <span className="text-xs text-dim">{timeAgo(article.published_at)}</span>
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
            onClick={onDelete}
            disabled={isDeleting}
            className="p-1.5 text-dim hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div onClick={onClick} className={`flex flex-col overflow-hidden ${cardBase}`}>
      {article.image_url && (
        <img
          src={article.image_url}
          alt=""
          className="w-full h-32 object-cover"
          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      )}
      <div className="p-3 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm font-medium line-clamp-3 leading-snug flex-1 ${isDarkMode ? 'text-silver' : 'text-ink'}`}>{article.title}</p>
          <button
            onClick={e => { e.stopPropagation(); onSelect(); }}
            className="p-1 rounded hover:bg-white/10 transition-colors shrink-0"
          >
            {selected ? <CheckSquare size={16} className="text-volt" /> : <Square size={16} className="text-dim" />}
          </button>
        </div>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="text-xs text-volt hover:text-volt/80 font-medium flex items-center gap-0.5"
          >
            {article.source} <ExternalLink className="w-2.5 h-2.5" />
          </a>
          <span className="text-xs text-dim">{timeAgo(article.published_at)}</span>
          {viralityPct > 0 && (
            <span className="flex items-center gap-0.5 text-xs text-amber-400 ml-auto">
              <Flame className="w-3 h-3" />{viralityPct}%
            </span>
          )}
          {(article.tags ?? []).map(tag => (
            <ArticleTag key={tag} tag={tag} />
          ))}
        </div>
        <div className={`flex gap-2 mt-3 pt-2 border-t opacity-0 group-hover:opacity-100 transition-opacity ${isDarkMode ? 'border-graphite/40' : 'border-graphite/20'}`} onClick={e => e.stopPropagation()}>
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="p-1.5 text-dim hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

interface ModalProps {
  article: Article;
  onClose: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}

const ArticleModal: React.FC<ModalProps> = ({ article, onClose, onDelete, isDeleting }) => {
  const isDarkMode = useUIStore((s) => s.isDarkMode);
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
        className={`border rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden ${
          isDarkMode ? 'bg-void border-graphite/40' : 'bg-cream border-graphite/20'
        }`}
      >
        <div className={`flex items-start justify-between p-5 border-b ${isDarkMode ? 'border-graphite/40' : 'border-graphite/20'}`}>
          <div className="flex-1 min-w-0 pr-4">
            <h2 className={`text-base font-semibold leading-snug ${isDarkMode ? 'text-silver' : 'text-ink'}`}>{article.title}</h2>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-volt hover:text-volt/80 flex items-center gap-0.5 font-medium"
              >
                {article.source} <ExternalLink className="w-3 h-3" />
              </a>
              <span className="text-xs text-dim flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {article.published_at ? new Date(article.published_at).toLocaleDateString() : 'Unknown'}
              </span>
              {virality > 0 && (
                <span className="text-xs text-amber-400 flex items-center gap-0.5">
                  <Flame className="w-3 h-3" />
                  {Math.round(virality * 100)}% virality
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-dim hover:text-silver hover:bg-graphite/20 rounded-lg shrink-0">
            <span className="text-lg">×</span>
          </button>
        </div>

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
              <p className="text-xs font-bold text-dim uppercase tracking-widest mb-2">Key Insights</p>
              <ul className="space-y-1">
                {insights.map((insight, i) => (
                  <li key={i} className={`flex gap-2 text-sm ${isDarkMode ? 'text-silver' : 'text-ink'}`}>
                    <span className="text-volt shrink-0">•</span>
                    {insight}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <p className="text-xs font-bold text-dim uppercase tracking-widest mb-2">Content</p>
            <div className={`rounded-xl p-4 max-h-64 overflow-auto ${isDarkMode ? 'bg-graphite/20' : 'bg-stellar/30'}`}>
              <p className={`text-sm leading-relaxed whitespace-pre-wrap ${isDarkMode ? 'text-silver' : 'text-ink'}`}>
                {article.full_content || article.raw_excerpt || article.summary_hint || 'No content available.'}
              </p>
            </div>
          </div>
        </div>

        <div className={`flex items-center justify-between p-4 border-t gap-3 ${isDarkMode ? 'border-graphite/40' : 'border-graphite/20'}`}>
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-danger hover:bg-danger/10 rounded-xl transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl transition-colors ${isDarkMode ? 'text-dim hover:bg-graphite/20 hover:text-silver' : 'text-muted hover:bg-stellar/30 hover:text-ink'}`}
          >
            <ExternalLink className="w-4 h-4" /> Source
          </a>
        </div>
      </motion.div>
    </motion.div>
  );
};
