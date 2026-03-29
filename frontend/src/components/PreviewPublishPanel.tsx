import React, { useState } from 'react';
import { Send, Calendar, Copy, Check, RefreshCw, Eye, Edit } from 'lucide-react';
import { Card } from './Card';
import { Button } from './Button';
import { Badge } from './Badge';
import type { Draft, Platform } from '../types';

interface PreviewPublishPanelProps {
  draft?: Draft;
  onPublish?: () => void;
  onSchedule?: (date: Date) => void;
  onCopy?: () => void;
  onRegenerate?: () => void;
  onEdit?: () => void;
}

export const PreviewPublishPanel: React.FC<PreviewPublishPanelProps> = ({
  draft,
  onPublish,
  onSchedule,
  onCopy,
  onRegenerate,
  onEdit,
}) => {
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('12:00');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (draft?.body && onCopy) {
      onCopy();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSchedule = () => {
    if (scheduleDate && onSchedule) {
      const dateTime = new Date(`${scheduleDate}T${scheduleTime}`);
      onSchedule(dateTime);
      setIsScheduling(false);
      setScheduleDate('');
      setScheduleTime('12:00');
    }
  };

  const renderPlatformPreview = () => {
    if (!draft) return null;

    switch (draft.platform as Platform) {
      case 'linkedin':
        return <LinkedInPreview content={draft.body} />;
      case 'framer':
        return <FramerPreview content={draft.body} />;
      case 'x':
        return <TwitterPreview content={draft.body} />;
      default:
        return <GenericPreview content={draft.body} />;
    }
  };

  if (!draft) {
    return (
      <Card className="flex flex-col items-center justify-center py-12">
        <Eye className="h-12 w-12 text-text-tertiary mb-4" />
        <h3 className="text-lg font-semibold text-text-primary mb-2">No Draft Selected</h3>
        <p className="text-text-secondary text-center max-w-md">
          Select or generate a draft to see the preview and publishing options.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Preview Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-text-primary">Preview & Publish</h3>
          <div className="flex items-center gap-3">
            <Badge variant="secondary">{draft.platform}</Badge>
            <span className="text-sm text-text-secondary">
              {draft.body.length} characters
              {draft.platform === 'x' && ` (${Math.ceil(draft.body.length / 280)} tweets)`}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={onEdit}
            icon={<Edit className="h-4 w-4" />}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onRegenerate}
            icon={<RefreshCw className="h-4 w-4" />}
          >
            Regenerate
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCopy}
            icon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          >
            {copied ? 'Copied!' : 'Copy'}
          </Button>
        </div>
      </div>

      {/* Platform Preview */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-border-primary">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-accent-primary" />
              <span className="text-sm font-medium text-text-primary">
                {draft.platform.charAt(0).toUpperCase() + draft.platform.slice(1)} Preview
              </span>
            </div>
            <Badge variant="secondary">Simulation</Badge>
          </div>
        </div>
        <div className="p-6 max-h-[500px] overflow-y-auto">
          {renderPlatformPreview()}
        </div>
      </Card>

      {/* Publishing Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Publish Now */}
        <Card>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-accent-primary/10 flex items-center justify-center">
                <Send className="h-5 w-5 text-accent-primary" />
              </div>
              <div>
                <h4 className="font-medium text-text-primary">Publish Now</h4>
                <p className="text-sm text-text-secondary">Publish immediately to {draft.platform}</p>
              </div>
            </div>
            <Button
              onClick={onPublish}
              className="w-full"
              size="lg"
            >
              <Send className="mr-2 h-4 w-4" />
              Publish Now
            </Button>
          </div>
        </Card>

        {/* Schedule */}
        <Card>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-accent-secondary/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-accent-secondary" />
              </div>
              <div>
                <h4 className="font-medium text-text-primary">Schedule</h4>
                <p className="text-sm text-text-secondary">Schedule for later publishing</p>
              </div>
            </div>

            {!isScheduling ? (
              <Button
                variant="outline"
                onClick={() => setIsScheduling(true)}
                className="w-full"
              >
                <Calendar className="mr-2 h-4 w-4" />
                Schedule for Later
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="input w-full"
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">
                      Time
                    </label>
                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="input w-full"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => setIsScheduling(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSchedule}
                    disabled={!scheduleDate}
                    className="flex-1"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    Schedule
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Draft Summary */}
      {draft.summary && (
        <Card variant="outline">
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-text-primary">AI Summary</h4>
            <p className="text-sm text-text-secondary">{draft.summary}</p>
          </div>
        </Card>
      )}
    </div>
  );
};

// Platform-specific preview components
const LinkedInPreview: React.FC<{ content: string }> = ({ content }) => {
  return (
    <div className="max-w-2xl mx-auto bg-[#f3f2ef] rounded-lg border border-gray-300 overflow-hidden font-sans">
      <div className="p-4 bg-white">
        <div className="flex items-start gap-3 mb-4">
          <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
            <span className="text-gray-600 font-bold">LT</span>
          </div>
          <div>
            <p className="font-semibold text-gray-900">Legal Times</p>
            <p className="text-sm text-gray-600">Legal Content Platform • 1st</p>
            <p className="text-xs text-gray-500 mt-1">Just now • 🌎</p>
          </div>
        </div>
        <div className="text-gray-900 whitespace-pre-wrap leading-relaxed">
          {content}
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between text-gray-600">
          <div className="flex items-center gap-6">
            <span className="text-sm">👍 242</span>
            <span className="text-sm">💬 42 comments</span>
            <span className="text-sm">🔄 12 reposts</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const FramerPreview: React.FC<{ content: string }> = ({ content }) => {
  return (
    <div className="max-w-2xl mx-auto bg-black text-white rounded-lg overflow-hidden font-mono">
      <div className="p-4 bg-gray-900 flex items-center gap-2">
        <div className="h-3 w-3 rounded-full bg-red-500" />
        <div className="h-3 w-3 rounded-full bg-yellow-500" />
        <div className="h-3 w-3 rounded-full bg-green-500" />
        <div className="ml-4 h-4 flex-1 max-w-[200px] bg-gray-800 rounded" />
      </div>
      <div className="p-6">
        <div className="text-sm text-gray-400 mb-2">// JSON Output for Framer CMS</div>
        <pre className="text-sm whitespace-pre-wrap text-gray-300">
          {JSON.stringify({
            title: "Legal Analysis",
            excerpt: content.substring(0, 100) + '...',
            body_md: content,
            slug: "legal-analysis-" + Date.now(),
            published: true
          }, null, 2)}
        </pre>
      </div>
    </div>
  );
};

const TwitterPreview: React.FC<{ content: string }> = ({ content }) => {
  const tweets = content.split('---').filter(t => t.trim());

  return (
    <div className="max-w-2xl mx-auto bg-black rounded-2xl border border-gray-800 overflow-hidden">
      {tweets.map((tweet, i) => (
        <div key={i} className="p-4 border-b border-gray-800 hover:bg-gray-900 transition-colors">
          <div className="flex gap-3">
            <div className="h-10 w-10 rounded-full bg-gray-700 flex items-center justify-center">
              <span className="text-white font-bold">LT</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-white">Legal Times</span>
                <span className="text-gray-500">@legal_times</span>
                <span className="text-gray-500">· Just now</span>
              </div>
              <div className="text-white whitespace-pre-wrap">
                {tweet.trim()}
              </div>
              <div className="mt-3 flex items-center gap-6 text-gray-500">
                <button className="hover:text-blue-400">💬</button>
                <button className="hover:text-green-400">🔄</button>
                <button className="hover:text-red-400">❤️</button>
                <button className="hover:text-blue-400">📊</button>
                <button className="hover:text-blue-400">📤</button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const GenericPreview: React.FC<{ content: string }> = ({ content }) => {
  return (
    <div className="max-w-2xl mx-auto bg-bg-secondary rounded-lg border border-border-primary p-6">
      <div className="text-sm text-text-secondary mb-2">Preview</div>
      <div className="whitespace-pre-wrap text-text-primary">
        {content}
      </div>
    </div>
  );
};