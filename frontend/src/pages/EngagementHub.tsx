import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MessageCircle, Send, Bot, Sparkles, User, Radar, Filter } from 'lucide-react'
import toast from 'react-hot-toast'

import { Card } from '../components/Card'
import { Badge } from '../components/Badge'
import { Spinner } from '../components/Spinner'
import { EmptyState } from '../components/EmptyState'
import { SkeletonList } from '../components/Skeleton'
import { PlatformIcon } from '../components/PlatformIcon'
import { api } from '../lib/api'
import { useStatusSocket } from '../hooks/useStatusSocket'
import type { EngagementScanResult } from '../types'

export function EngagementHub() {
  const queryClient = useQueryClient()
  const status = useStatusSocket()
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({})
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [scanResult, setScanResult] = useState<EngagementScanResult | null>(null)

  const { data: comments, isLoading } = useQuery({
    queryKey: ['comments'],
    queryFn: () => api.listComments(),
  })

  const replyMutation = useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) => api.replyComment(id, text),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['comments'] })
      toast.success('Reply sent!')
    },
    onError: (err) => toast.error((err as Error).message),
  })

  const toggleAutoReply = useMutation({
    mutationFn: (enabled: boolean) => api.toggleAutoReply(enabled),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['comments'] })
      toast.success(`Auto-reply ${result.enabled ? 'enabled' : 'disabled'}`)
    },
  })

  const scanMutation = useMutation({
    mutationFn: api.runEngagement,
    onSuccess: (result) => {
      setScanResult(result)
      toast.success(`Found ${result.high_intent} high-intent comments out of ${result.new_comments} new`)
    },
    onError: (err) => toast.error((err as Error).message),
  })

  const autoReplyEnabled = status?.autoReplyEnabled ?? false
  const newCount = comments?.filter((c) => c.status === 'new').length ?? 0
  const repliedCount = comments?.filter((c) => c.status === 'replied').length ?? 0

  const filtered = (comments ?? []).filter((c) => {
    if (!filterStatus) return true
    if (filterStatus === 'high_intent' && scanResult) {
      return scanResult.high_intent_ids.includes(c.id)
    }
    return c.status === filterStatus
  })

  const filterOptions = [
    { key: '', label: 'All', count: comments?.length ?? 0 },
    { key: 'new', label: 'New', count: newCount },
    { key: 'replied', label: 'Replied', count: repliedCount },
    ...(scanResult
      ? [{ key: 'high_intent', label: 'High Intent', count: scanResult.high_intent }]
      : []),
  ]

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="font-serif text-xl text-cream">Comments</h2>
          {newCount > 0 && (
            <Badge variant="amber" size="md" dot>
              {newCount} new
            </Badge>
          )}
          {repliedCount > 0 && (
            <Badge variant="success" size="md">
              {repliedCount} replied
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Run engagement scan */}
          <button
            onClick={() => scanMutation.mutate()}
            disabled={scanMutation.isPending}
            className="btn-secondary text-xs"
          >
            {scanMutation.isPending ? <Spinner size={14} /> : <Radar size={14} />}
            Scan Engagement
          </button>

          {/* Auto-reply toggle */}
          <button
            onClick={() => toggleAutoReply.mutate(!autoReplyEnabled)}
            disabled={toggleAutoReply.isPending}
            className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
              autoReplyEnabled
                ? 'border-success/50 bg-success/10 text-success'
                : 'border-stroke/50 bg-panel/50 text-muted hover:border-stroke hover:text-cream'
            }`}
          >
            {toggleAutoReply.isPending ? <Spinner size={14} /> : <Bot size={16} />}
            Auto-reply {autoReplyEnabled ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Scan result banner */}
      {scanResult && (
        <Card padding="sm" className="border-info/30 bg-info/5">
          <div className="flex items-center gap-3 text-sm">
            <Radar size={16} className="text-info" />
            <span className="text-cream">
              Scan: <strong>{scanResult.total_comments}</strong> total,{' '}
              <strong>{scanResult.new_comments}</strong> new,{' '}
              <strong className="text-amber">{scanResult.high_intent}</strong> high-intent
            </span>
            <button
              onClick={() => setFilterStatus('high_intent')}
              className="ml-auto btn-ghost text-xs text-info"
            >
              <Filter size={12} /> Show high-intent only
            </button>
          </div>
        </Card>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2">
        {filterOptions.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilterStatus(f.key)}
            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-all ${
              filterStatus === f.key
                ? 'bg-amber/15 text-amber'
                : 'text-muted hover:bg-white/5 hover:text-cream'
            }`}
          >
            {f.label}
            <span className="rounded-full bg-ink/60 px-1.5 py-0.5 text-[10px]">{f.count}</span>
          </button>
        ))}
      </div>

      {/* Comment list */}
      {isLoading ? (
        <SkeletonList count={3} />
      ) : !filtered?.length ? (
        <Card>
          <EmptyState
            icon={MessageCircle}
            title="No comments found"
            description={
              filterStatus
                ? 'No comments match the current filter.'
                : 'Comments will appear here after you publish content.'
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((comment) => {
            const expanded = expandedId === comment.id
            const replyText = replyTexts[comment.id] ?? comment.ai_suggested_reply ?? ''
            const isNew = comment.status === 'new'
            const isReplied = comment.status === 'replied'
            const isHighIntent = scanResult?.high_intent_ids.includes(comment.id)

            return (
              <Card
                key={comment.id}
                padding="sm"
                hover
                className={isHighIntent ? 'border-amber/30' : isNew ? 'border-amber/15' : ''}
              >
                <div className="flex gap-3">
                  {/* Avatar */}
                  <div
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${
                      isHighIntent
                        ? 'border-amber/50 bg-amber/15'
                        : isNew
                          ? 'border-amber/30 bg-amber/10'
                          : 'border-stroke/40 bg-ink/40'
                    }`}
                  >
                    <User
                      size={16}
                      className={isHighIntent ? 'text-amber' : isNew ? 'text-amber/70' : 'text-muted-dim'}
                    />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-sm font-semibold text-cream">{comment.author}</span>
                      <PlatformIcon platform={comment.platform} size={13} />
                      <Badge
                        variant={isNew ? 'amber' : isReplied ? 'success' : 'muted'}
                        size="sm"
                        dot={isNew}
                      >
                        {comment.status}
                      </Badge>
                      {isHighIntent && (
                        <Badge variant="amber" size="sm">
                          High intent
                        </Badge>
                      )}
                      <span className="ml-auto text-[11px] text-muted-dim">
                        {new Date(comment.created_at).toLocaleString()}
                      </span>
                    </div>

                    <p className="text-sm leading-relaxed text-cream/90">{comment.text}</p>

                    {/* AI suggestion preview */}
                    {comment.ai_suggested_reply && !expanded && isNew && (
                      <div className="mt-2 flex items-start gap-2 rounded-lg border border-stroke/30 bg-ink/30 p-2.5">
                        <Sparkles size={13} className="mt-0.5 shrink-0 text-amber" />
                        <p className="line-clamp-2 text-xs text-muted">{comment.ai_suggested_reply}</p>
                      </div>
                    )}

                    {/* Reply actions */}
                    {isNew && (
                      <div className="mt-2">
                        {!expanded ? (
                          <button
                            onClick={() => setExpandedId(comment.id)}
                            className="btn-ghost text-xs py-1.5 px-3"
                          >
                            <Send size={12} /> Reply
                          </button>
                        ) : (
                          <div className="space-y-2">
                            <textarea
                              value={replyText}
                              onChange={(e) =>
                                setReplyTexts((prev) => ({ ...prev, [comment.id]: e.target.value }))
                              }
                              placeholder="Write your reply..."
                              className="input-field min-h-[80px] resize-y text-sm"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() =>
                                  replyMutation.mutate({ id: comment.id, text: replyText })
                                }
                                disabled={!replyText.trim() || replyMutation.isPending}
                                className="btn-primary text-xs"
                              >
                                {replyMutation.isPending ? <Spinner size={14} /> : <Send size={14} />}
                                Send Reply
                              </button>
                              <button onClick={() => setExpandedId(null)} className="btn-ghost text-xs">
                                Cancel
                              </button>
                              {comment.ai_suggested_reply && (
                                <button
                                  onClick={() =>
                                    setReplyTexts((prev) => ({
                                      ...prev,
                                      [comment.id]: comment.ai_suggested_reply ?? '',
                                    }))
                                  }
                                  className="btn-ghost text-xs text-amber"
                                >
                                  <Sparkles size={12} /> Use AI suggestion
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
