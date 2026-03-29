import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Sparkles } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { ContentGenerationPanel } from '../components/ContentGenerationPanel';
import type { Article, Draft } from '../types';

// Mock data for demonstration
const MOCK_ARTICLES: Article[] = [
  {
    id: '1',
    source: 'LiveLaw',
    title: 'Supreme Court Rules on Digital Privacy Rights in Landmark Case',
    url: 'https://example.com/article1',
    summary_hint: 'The Supreme Court has issued a landmark ruling expanding digital privacy protections...',
    published_at: '2024-03-28T10:30:00Z',
    kind: 'rss',
    content_intelligence: {
      topic: 'Digital Privacy',
      legal_area: 'Constitutional Law',
      audience: ['Legal professionals', 'Privacy advocates'],
      angle: 'Landmark ruling with wide implications',
      complexity_level: 'High',
      virality_score: 0.85,
      relevance_score: 0.92,
      key_insights: ['Expands privacy protections', 'Sets precedent for digital rights'],
      affected_parties: ['Tech companies', 'Government agencies'],
      legal_implications: ['New compliance requirements', 'Potential for more litigation'],
      suggested_hashtags: ['DigitalPrivacy', 'SupremeCourt', 'LandmarkCase']
    },
    structured_summary: 'The Supreme Court ruled that digital privacy is a fundamental right...',
    full_content: 'Full article content here...',
    raw_excerpt: null,
    extracted_facts: ['Fact 1', 'Fact 2'],
    court_name: 'Supreme Court of India',
    case_number: 'WP(C) 123/2023',
    judges_involved: ['Justice A', 'Justice B'],
    parties: ['Petitioner', 'Respondent'],
    jurisdiction: 'India',
    precedent_value: 'High'
  },
  {
    id: '2',
    source: 'Bar & Bench',
    title: 'High Court Clarifies Arbitration Award Enforcement Procedures',
    url: 'https://example.com/article2',
    summary_hint: 'The Delhi High Court has provided important clarifications on enforcement of arbitration awards...',
    published_at: '2024-03-27T14:45:00Z',
    kind: 'rss',
    content_intelligence: {
      topic: 'Arbitration',
      legal_area: 'Commercial Law',
      audience: ['Corporate lawyers', 'Arbitrators'],
      angle: 'Procedural clarification with practical impact',
      complexity_level: 'Medium',
      virality_score: 0.65,
      relevance_score: 0.78,
      key_insights: ['Clarifies enforcement timeline', 'Simplifies procedural requirements'],
      affected_parties: ['Arbitration practitioners', 'Corporate entities'],
      legal_implications: ['Faster enforcement', 'Reduced litigation costs'],
      suggested_hashtags: ['Arbitration', 'CommercialLaw', 'HighCourt']
    },
    structured_summary: 'The Delhi High Court clarified procedures for enforcing arbitration awards...',
    full_content: 'Full article content here...',
    raw_excerpt: null,
    extracted_facts: ['Fact 1', 'Fact 2'],
    court_name: 'Delhi High Court',
    case_number: 'ARB.P. 456/2023',
    judges_involved: ['Justice C'],
    parties: ['Company A', 'Company B'],
    jurisdiction: 'Delhi',
    precedent_value: 'Medium'
  }
];

export const ContentGenerationPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedArticle, setSelectedArticle] = useState<Article | undefined>(MOCK_ARTICLES[0]);
  const [generatedDrafts, setGeneratedDrafts] = useState<Draft[]>([]);

  const handleDraftGenerated = (draft: Draft) => {
    setGeneratedDrafts(prev => [...prev, draft]);
  };

  const handleDraftUpdated = (draft: Draft) => {
    setGeneratedDrafts(prev => prev.map(d => d.id === draft.id ? draft : d));
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/news-search')}
              className="p-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-semibold text-text-primary">Content Generation</h1>
          </div>
          <p className="text-text-secondary">
            Generate platform-specific content from selected articles. Edit, preview, and prepare for publishing.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="secondary">
            {generatedDrafts.length} draft{generatedDrafts.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Article Selection */}
        <div className="space-y-6">
          <Card>
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-text-primary">Select Article</h3>
              <div className="space-y-3">
                {MOCK_ARTICLES.map((article) => (
                  <button
                    key={article.id}
                    onClick={() => setSelectedArticle(article)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedArticle?.id === article.id
                        ? 'border-accent-primary bg-accent-primary/5'
                        : 'border-border-primary bg-bg-secondary hover:border-border-secondary'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" size="sm">
                        {article.source}
                      </Badge>
                      <span className="text-xs text-text-tertiary">
                        {article.published_at ? new Date(article.published_at).toLocaleDateString() : 'Recent'}
                      </span>
                    </div>
                    <h4 className="text-sm font-medium text-text-primary line-clamp-2">
                      {article.title}
                    </h4>
                    {article.summary_hint && (
                      <p className="mt-1 text-xs text-text-secondary line-clamp-2">
                        {article.summary_hint}
                      </p>
                    )}
                  </button>
                ))}
              </div>

              <Button
                variant="ghost"
                onClick={() => navigate('/news-search')}
                className="w-full"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to News Search
              </Button>
            </div>
          </Card>

          {/* Generated Drafts */}
          {generatedDrafts.length > 0 && (
            <Card>
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-text-primary">Generated Drafts</h3>
                <div className="space-y-2">
                  {generatedDrafts.map((draft) => (
                    <div
                      key={draft.id}
                      className="p-3 rounded-lg border border-border-primary bg-bg-secondary"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="secondary" size="sm">
                          {draft.platform}
                        </Badge>
                        <span className="text-xs text-text-tertiary">
                          {draft.body.length} chars
                        </span>
                      </div>
                      <p className="text-sm text-text-primary line-clamp-2">
                        {draft.body.substring(0, 100)}...
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Center & Right: Content Generation Panel */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <ContentGenerationPanel
              selectedArticle={selectedArticle}
              onDraftGenerated={handleDraftGenerated}
              onDraftUpdated={handleDraftUpdated}
            />
          </Card>
        </div>
      </div>

      {/* Bottom Actions */}
      {generatedDrafts.length > 0 && (
        <div className="flex justify-end gap-3">
          <Button
            variant="ghost"
            onClick={() => setGeneratedDrafts([])}
          >
            Clear All Drafts
          </Button>
          <Button
            onClick={() => {
              // Navigate to preview/publish page
              console.log('Proceed to preview/publish');
            }}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Proceed to Preview & Publish
          </Button>
        </div>
      )}
    </div>
  );
};