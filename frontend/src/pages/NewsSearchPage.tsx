import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Search, FolderOpen } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { NewsSearchPanel } from '../components/NewsSearchPanel';
import type { Article } from '../types';

export const NewsSearchPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedArticles, setSelectedArticles] = useState<Article[]>([]);

  const handleArticlesSelected = (articles: Article[]) => {
    setSelectedArticles(articles);
  };

  const handleContinueToGeneration = () => {
    if (selectedArticles.length > 0) {
      // Store selected articles in state or context
      // For now, navigate to content generation with first article
      navigate('/studio');
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-text-primary">News Search</h1>
        <p className="text-text-secondary">
          Search for legal news using Tavily, RSS feeds, or manual input. Select articles to add to your workspace.
        </p>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Search Panel */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <NewsSearchPanel
              onArticlesSelected={handleArticlesSelected}
              selectedArticles={selectedArticles}
            />
          </Card>
        </div>

        {/* Right: Workspace & Actions */}
        <div className="space-y-6">
          {/* Workspace Summary */}
          <Card>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text-primary">Workspace</h3>
                <Badge variant="primary">{selectedArticles.length} selected</Badge>
              </div>

              {selectedArticles.length > 0 ? (
                <div className="space-y-3">
                  <div className="text-sm text-text-secondary">
                    {selectedArticles.length === 1 ? '1 article' : `${selectedArticles.length} articles`} ready for content generation
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-2 scrollbar-thin">
                    {selectedArticles.map((article) => (
                      <div
                        key={article.id}
                        className="p-3 rounded-lg border border-border-primary bg-bg-secondary"
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
                            <h4 className="text-sm font-medium text-text-primary truncate">
                              {article.title}
                            </h4>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Search className="mx-auto h-8 w-8 text-text-tertiary mb-3" />
                  <div className="text-text-tertiary mb-1">No articles selected</div>
                  <p className="text-sm text-text-tertiary">
                    Search and select articles to add them to your workspace
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button
                  onClick={handleContinueToGeneration}
                  disabled={selectedArticles.length === 0}
                  className="w-full"
                  size="lg"
                >
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Continue to Content Generation
                </Button>

                {selectedArticles.length > 0 && (
                  <Button
                    variant="ghost"
                    onClick={() => setSelectedArticles([])}
                    className="w-full"
                  >
                    Clear Workspace
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* Quick Tips */}
          <Card variant="outline">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-text-primary">Tips</h3>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-accent-primary mt-1.5" />
                  <span>Use specific keywords for better search results</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-accent-primary mt-1.5" />
                  <span>Filter by content type (text, images, full articles)</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-accent-primary mt-1.5" />
                  <span>Select multiple articles to batch generate content</span>
                </li>
              </ul>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};