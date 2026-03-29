import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Code, Sparkles, Edit, Copy, RefreshCw } from 'lucide-react';
import { Card } from './Card';
import { Button } from './Button';
import { Badge } from './Badge';
import { api } from '../lib/api';
import type { Article, Draft, Platform } from '../types';
import { PlatformIcon } from './PlatformIcon';

interface ContentGenerationPanelProps {
  selectedArticle?: Article;
  onDraftGenerated?: (draft: Draft) => void;
  onDraftUpdated?: (draft: Draft) => void;
}

type PlatformType = 'linkedin' | 'framer' | 'x';

const PLATFORMS: { id: PlatformType; name: string; icon: React.ReactNode; description: string }[] = [
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: <PlatformIcon platform="linkedin" size={20} />,
    description: 'Professional posts for profile or company pages',
  },
  {
    id: 'framer',
    name: 'Framer',
    icon: <Code className="h-5 w-5" />,
    description: 'JSON format for CMS integration',
  },
  {
    id: 'x',
    name: 'X/Twitter',
    icon: <PlatformIcon platform="x" size={20} />,
    description: 'Threads with character limits',
  },
];

export const ContentGenerationPanel: React.FC<ContentGenerationPanelProps> = ({
  selectedArticle,
  onDraftGenerated,
  onDraftUpdated,
}) => {
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType>('linkedin');
  const [generatedDraft, setGeneratedDraft] = useState<Draft | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');

  const generateMutation = useMutation({
    mutationFn: () => {
      if (!selectedArticle) {
        throw new Error('No article selected');
      }
      return api.generateDraft({
        article_id: selectedArticle.id,
        platform: selectedPlatform as Platform,
      });
    },
    onSuccess: (draft) => {
      setGeneratedDraft(draft);
      setEditedContent(draft.body);
      onDraftGenerated?.(draft);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (content: string) => {
      if (!generatedDraft) {
        throw new Error('No draft to update');
      }
      return api.updateDraft(generatedDraft.id, { body: content });
    },
    onSuccess: (draft) => {
      setGeneratedDraft(draft);
      onDraftUpdated?.(draft);
    },
  });

  const handleGenerate = () => {
    if (selectedArticle) {
      generateMutation.mutate();
    }
  };

  const handleSaveEdit = () => {
    if (editedContent.trim() && generatedDraft) {
      updateMutation.mutate(editedContent);
      setIsEditing(false);
    }
  };

  const handleCopyToClipboard = () => {
    if (generatedDraft?.body) {
      navigator.clipboard.writeText(generatedDraft.body);
      // Could add toast notification here
    }
  };

  const handleRegenerate = () => {
    if (selectedArticle) {
      generateMutation.mutate();
    }
  };

  const getPlatformSpecificInfo = (platform: PlatformType) => {
    switch (platform) {
      case 'linkedin':
        return {
          characterLimit: '1200-1800 characters',
          features: ['Profile & Company pages', 'Unicode bold formatting', 'Hashtag optimization'],
        };
      case 'framer':
        return {
          characterLimit: 'No hard limit',
          features: ['JSON format output', 'CMS field mapping', 'Direct publishing'],
        };
      case 'x':
        return {
          characterLimit: '280 characters/tweet',
          features: ['Thread support', 'Auto-split', 'Media attachment'],
        };
    }
  };

  const platformInfo = getPlatformSpecificInfo(selectedPlatform);

  return (
    <div className="flex h-full flex-col space-y-6">
      {/* Selected Article Display */}
      {selectedArticle ? (
        <Card>
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary">{selectedArticle.source}</Badge>
                  <span className="text-xs text-text-tertiary">
                    {selectedArticle.published_at ? new Date(selectedArticle.published_at).toLocaleDateString() : 'Recent'}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-text-primary">
                  {selectedArticle.title}
                </h3>
                {selectedArticle.summary_hint && (
                  <p className="mt-2 text-sm text-text-secondary">
                    {selectedArticle.summary_hint}
                  </p>
                )}
              </div>
              <a
                href={selectedArticle.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-accent-primary hover:text-accent-primary/80"
              >
                View source
              </a>
            </div>
          </div>
        </Card>
      ) : (
        <Card variant="outline">
          <div className="text-center py-8">
            <div className="text-text-tertiary mb-2">No article selected</div>
            <p className="text-sm text-text-tertiary">
              Select an article from the News Search panel to generate content
            </p>
          </div>
        </Card>
      )}

      {/* Platform Selection */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-text-primary">Select Platform</h3>
        <div className="grid grid-cols-3 gap-3">
          {PLATFORMS.map((platform) => (
            <button
              key={platform.id}
              onClick={() => setSelectedPlatform(platform.id)}
              className={`flex flex-col items-center justify-center rounded-lg border p-4 transition-all ${
                selectedPlatform === platform.id
                  ? 'border-accent-primary bg-accent-primary/5'
                  : 'border-border-primary bg-bg-secondary hover:border-border-secondary'
              }`}
            >
              <div className={`mb-2 ${
                selectedPlatform === platform.id ? 'text-accent-primary' : 'text-text-secondary'
              }`}>
                {platform.icon}
              </div>
              <div className="text-sm font-medium text-text-primary">{platform.name}</div>
              <div className="mt-1 text-xs text-text-tertiary text-center">
                {platform.description}
              </div>
            </button>
          ))}
        </div>

        {/* Platform Info */}
        <Card variant="outline" padding="sm">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-text-primary">
                {PLATFORMS.find(p => p.id === selectedPlatform)?.name} Requirements
              </div>
              <Badge variant="secondary">{platformInfo.characterLimit}</Badge>
            </div>
            <ul className="space-y-1">
              {platformInfo.features.map((feature, index) => (
                <li key={index} className="flex items-center text-xs text-text-secondary">
                  <div className="mr-2 h-1.5 w-1.5 rounded-full bg-accent-primary" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>

      {/* Generate Button */}
      <div className="flex gap-3">
        <Button
          onClick={handleGenerate}
          loading={generateMutation.isPending}
          disabled={!selectedArticle || generateMutation.isPending}
          className="flex-1"
          size="lg"
        >
          <Sparkles className="mr-2 h-4 w-4" />
          Generate {PLATFORMS.find(p => p.id === selectedPlatform)?.name} Content
        </Button>
      </div>

      {/* Generated Content */}
      {generatedDraft && (
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-text-primary">Generated Content</h3>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsEditing(!isEditing)}
                disabled={updateMutation.isPending}
              >
                <Edit className="mr-1 h-3 w-3" />
                {isEditing ? 'Cancel' : 'Edit'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCopyToClipboard}
              >
                <Copy className="mr-1 h-3 w-3" />
                Copy
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleRegenerate}
                disabled={generateMutation.isPending}
              >
                <RefreshCw className="mr-1 h-3 w-3" />
                Regenerate
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden border border-border-primary rounded-lg bg-bg-primary">
            {isEditing ? (
              <div className="h-full flex flex-col">
                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="flex-1 w-full p-4 text-sm text-text-primary bg-transparent resize-none outline-none scrollbar-thin"
                  placeholder="Edit the generated content..."
                />
                <div className="border-t border-border-primary p-3 flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveEdit}
                    loading={updateMutation.isPending}
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            ) : (
              <div className="h-full overflow-y-auto p-4 scrollbar-thin">
                <pre className="whitespace-pre-wrap text-sm text-text-primary font-sans">
                  {generatedDraft.body}
                </pre>
                {generatedDraft.summary && (
                  <div className="mt-4 pt-4 border-t border-border-primary">
                    <div className="text-xs font-medium text-text-secondary mb-1">Summary</div>
                    <div className="text-sm text-text-primary">{generatedDraft.summary}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Character Count */}
          <div className="mt-2 text-right">
            <span className="text-xs text-text-tertiary">
              {generatedDraft.body.length} characters
              {selectedPlatform === 'x' && ` (${Math.ceil(generatedDraft.body.length / 280)} tweets)`}
            </span>
          </div>
        </div>
      )}

      {/* Empty State for Generated Content */}
      {!generatedDraft && selectedArticle && (
        <Card variant="outline" className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Sparkles className="mx-auto h-8 w-8 text-text-tertiary mb-3" />
            <div className="text-text-tertiary mb-1">Content not generated yet</div>
            <p className="text-sm text-text-tertiary">
              Click "Generate Content" to create {PLATFORMS.find(p => p.id === selectedPlatform)?.name} post
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};