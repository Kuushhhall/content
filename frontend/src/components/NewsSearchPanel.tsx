import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Filter, Rss, Image as ImageIcon, FileText, Check, Plus } from 'lucide-react';
import { Card } from './Card';
import { Button } from './Button';
import { Badge } from './Badge';
import { api } from '../lib/api';
import type { Article } from '../types';

interface NewsSearchPanelProps {
  onArticlesSelected?: (articles: Article[]) => void;
  selectedArticles?: Article[];
}

type ContentType = 'text' | 'images' | 'full';
type SourceType = 'tavily' | 'rss' | 'manual';

export const NewsSearchPanel: React.FC<NewsSearchPanelProps> = ({
  onArticlesSelected,
  selectedArticles = [],
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [contentType, setContentType] = useState<ContentType>('text');
  const [sourceType, setSourceType] = useState<SourceType>('tavily');
  const [localSelected, setLocalSelected] = useState<Article[]>(selectedArticles);

  const { data: searchResults, isLoading, refetch } = useQuery({
    queryKey: ['newsSearch', searchQuery, contentType, sourceType],
    queryFn: async () => {
      if (sourceType === 'rss') {
        return api.searchRSS(
          searchQuery || undefined,
          undefined, // sources
          10
        );
      } else {
        // Map content type to backend parameters
        const includeImages = contentType === 'images';
        const backendContentType = contentType === 'full' ? 'full_articles' : 'text';

        return api.searchNews(
          searchQuery,
          10,
          'basic',
          undefined,
          undefined,
          undefined,
          includeImages,
          undefined,
          backendContentType
        );
      }
    },
    enabled: false, // Manual trigger
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      refetch();
    }
  };

  const toggleArticleSelection = (article: Article) => {
    const isSelected = localSelected.some(a => a.id === article.id);
    let newSelected: Article[];

    if (isSelected) {
      newSelected = localSelected.filter(a => a.id !== article.id);
    } else {
      newSelected = [...localSelected, article];
    }

    setLocalSelected(newSelected);
    onArticlesSelected?.(newSelected);
  };

  const addToWorkspace = () => {
    onArticlesSelected?.(localSelected);
  };

  const clearSelection = () => {
    setLocalSelected([]);
    onArticlesSelected?.([]);
  };

  return (
    <div className="flex h-full flex-col space-y-4">
      {/* Search Header */}
      <div className="space-y-4">
        <form onSubmit={handleSearch} className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for legal news..."
                className="input pl-10"
              />
            </div>
            <Button type="submit" loading={isLoading}>
              Search
            </Button>
          </div>

          {/* Filters */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <Filter className="h-4 w-4" />
                <span>Filters</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Content Type */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-text-secondary">Content Type</label>
                <div className="flex gap-1">
                  {(['text', 'images', 'full'] as ContentType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setContentType(type)}
                      className={`flex-1 rounded px-2 py-1.5 text-xs transition-colors ${
                        contentType === type
                          ? 'bg-accent-primary text-white'
                          : 'bg-bg-tertiary text-text-secondary hover:bg-border-primary'
                      }`}
                    >
                      {type === 'text' && <FileText className="mr-1 inline h-3 w-3" />}
                      {type === 'images' && <ImageIcon className="mr-1 inline h-3 w-3" />}
                      {type === 'full' && <FileText className="mr-1 inline h-3 w-3" />}
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Source Type */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-text-secondary">Source</label>
                <div className="flex gap-1">
                  {(['tavily', 'rss', 'manual'] as SourceType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setSourceType(type)}
                      className={`flex-1 rounded px-2 py-1.5 text-xs transition-colors ${
                        sourceType === type
                          ? 'bg-accent-primary text-white'
                          : 'bg-bg-tertiary text-text-secondary hover:bg-border-primary'
                      }`}
                    >
                      {type === 'rss' && <Rss className="mr-1 inline h-3 w-3" />}
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Selected Articles Summary */}
        {localSelected.length > 0 && (
          <Card variant="outline" padding="sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="primary">{localSelected.length} selected</Badge>
                <span className="text-sm text-text-secondary">
                  {localSelected.length === 1 ? 'article' : 'articles'} in workspace
                </span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={clearSelection}>
                  Clear
                </Button>
                <Button size="sm" onClick={addToWorkspace}>
                  <Plus className="mr-1 h-3 w-3" />
                  Add to Workspace
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Search Results */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="text-text-tertiary">Searching...</div>
          </div>
        ) : searchResults?.items && searchResults.items.length > 0 ? (
          <div className="space-y-2">
            {searchResults.items.map((article) => {
              const isSelected = localSelected.some(a => a.id === article.id);
              return (
                <Card
                  key={article.id}
                  hover
                  padding="sm"
                  onClick={() => toggleArticleSelection(article)}
                  className={`cursor-pointer transition-colors ${
                    isSelected ? 'border-accent-primary bg-accent-primary/5' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" size="sm">
                          {article.source}
                        </Badge>
                        <span className="text-xs text-text-tertiary">
                          {article.published_at ? new Date(article.published_at).toLocaleDateString() : 'Recent'}
                        </span>
                      </div>
                      <h3 className="text-sm font-medium text-text-primary truncate">
                        {article.title}
                      </h3>
                      {article.summary_hint && (
                        <p className="mt-1 text-xs text-text-secondary line-clamp-2">
                          {article.summary_hint}
                        </p>
                      )}
                    </div>
                    <div className="ml-2 flex-shrink-0">
                      {isSelected ? (
                        <Check className="h-5 w-5 text-accent-primary" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border border-border-primary" />
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : searchQuery ? (
          <div className="flex h-32 items-center justify-center">
            <div className="text-center text-text-tertiary">
              <p>No results found for "{searchQuery}"</p>
              <p className="text-xs mt-1">Try different keywords or filters</p>
            </div>
          </div>
        ) : (
          <div className="flex h-32 items-center justify-center">
            <div className="text-center text-text-tertiary">
              <Search className="mx-auto h-8 w-8 mb-2" />
              <p>Search for legal news to get started</p>
              <p className="text-xs mt-1">Use filters to refine your search</p>
            </div>
          </div>
        )}
      </div>

      {/* RSS Feed Option */}
      {sourceType === 'rss' && (
        <Card variant="outline" padding="sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Rss className="h-4 w-4 text-text-secondary" />
              <span className="text-sm text-text-primary">RSS Feeds Available</span>
            </div>
            <Button size="sm" variant="ghost">
              Configure
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};