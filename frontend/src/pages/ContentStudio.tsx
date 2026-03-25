import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Send,
  Save,
  Sparkles,
  Clock,
  FileText,
  ArrowLeft,
  ChevronRight,
  Layers,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { AnimatePresence, motion } from 'framer-motion'

import { Card } from '../components/Card'
import { Badge } from '../components/Badge'
import { Spinner } from '../components/Spinner'
import { EmptyState } from '../components/EmptyState'
import { PlatformIcon, PLATFORMS, getPlatformLabel } from '../components/PlatformIcon'
import { api } from '../lib/api'
import { useUIStore } from '../store/uiStore'
import type { Platform } from '../types'

export function ContentStudio() {
  const queryClient = useQueryClient()
  const { selectedArticleId, setSelectedArticleId, selectedDraftId, setSelectedDraftId, setTab } =
    useUIStore()

  const [platform, setPlatform] = useState<string>('linkedin')
  const [draftText, setDraftText] = useState('')
  const [scheduleAt, setScheduleAt] = useState('')
  const [showSchedule, setShowSchedule] = useState(false)
  const [batchPlatforms, setBatchPlatforms] = useState<Set<string>>(new Set())
  const [showBatch, setShowBatch] = useState(false)

  // Queries
  const articleQuery = useQuery({
    queryKey: ['articles'],
    queryFn: api.listArticles,
  })
  const selectedArticle = articleQuery.data?.find((a) => a.id === selectedArticleId)

  const draftsQuery = useQuery({
    queryKey: ['drafts', selectedArticleId],
    queryFn: () => api.listDrafts(selectedArticleId ?? undefined),
    enabled: !!selectedArticleId,
  })

  const selectedDraft = useMemo(
    () => draftsQuery.data?.find((d) => d.id === selectedDraftId) ?? null,
    [draftsQuery.data, selectedDraftId],
  )

  // Sync draft text when selecting a different draft
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (selectedDraft) {
      setDraftText(selectedDraft.body)
      setPlatform(selectedDraft.platform)
    }
  }, [selectedDraft])

  // Mutations
  const generateMutation = useMutation({
    mutationFn: () => {
      if (!selectedArticleId) throw new Error('Select an article first')
      return api.generateDraft(selectedArticleId, platform)
    },
    onSuccess: async (draft) => {
      setSelectedDraftId(draft.id)
      setDraftText(draft.body)
      await queryClient.invalidateQueries({ queryKey: ['drafts'] })
      toast.success(`Draft generated for ${getPlatformLabel(platform)}`)
    },
    onError: (err) => toast.error((err as Error).message),
  })

  const batchGenerateMutation = useMutation({
    mutationFn: () => {
      if (!selectedArticleId) throw new Error('Select an article first')
      if (batchPlatforms.size === 0) throw new Error('Select at least one platform')
      return api.batchGenerate(selectedArticleId, Array.from(batchPlatforms) as Platform[])
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['drafts'] })
      const successCount = result.drafts.length
      const errorCount = result.errors.length
      if (successCount > 0) {
        toast.success(`Generated ${successCount} drafts!`)
        setSelectedDraftId(result.drafts[0].id)
        setDraftText(result.drafts[0].body)
        setPlatform(result.drafts[0].platform)
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} platform(s) failed`)
      }
      setShowBatch(false)
    },
    onError: (err) => toast.error((err as Error).message),
  })

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!selectedDraftId) throw new Error('No draft to save')
      return api.updateDraft(selectedDraftId, draftText)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['drafts'] })
      toast.success('Draft saved')
    },
    onError: (err) => toast.error((err as Error).message),
  })

  const publishMutation = useMutation({
    mutationFn: () => {
      if (!selectedDraftId) throw new Error('No draft to publish')
      return api.publishNow(selectedDraftId)
    },
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['analytics'] }),
        queryClient.invalidateQueries({ queryKey: ['comments'] }),
      ])
      if (result.success) {
        toast.success(`Published to ${getPlatformLabel(result.platform)}!`)
      } else {
        toast.error(`Publish failed: ${result.message ?? 'Unknown error'}`)
      }
    },
    onError: (err) => toast.error((err as Error).message),
  })

  const scheduleMutation = useMutation({
    mutationFn: () => {
      if (!selectedDraftId || !scheduleAt) throw new Error('Select draft and time')
      return api.createSchedule(selectedDraftId, platform, new Date(scheduleAt).toISOString())
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['schedules'] })
      setShowSchedule(false)
      setScheduleAt('')
      toast.success('Post scheduled!')
      setTab('scheduler')
    },
    onError: (err) => toast.error((err as Error).message),
  })

  const charCount = draftText.length
  const tweetCount = platform === 'x' ? draftText.split('---').length : 0

  const toggleBatchPlatform = (p: string) => {
    setBatchPlatforms((prev) => {
      const next = new Set(prev)
      if (next.has(p)) next.delete(p)
      else next.add(p)
      return next
    })
  }

  if (!selectedArticleId || !selectedArticle) {
    return (
      <Card>
        <EmptyState
          icon={FileText}
          title="No article selected"
          description="Go to the News Feed tab and select an article to start drafting content."
          action={
            <button onClick={() => setTab('news')} className="btn-secondary text-xs">
              <ArrowLeft size={14} /> Go to News Feed
            </button>
          }
        />
      </Card>
    )
  }

  return (
    <div className="grid gap-5 lg:grid-cols-12">
      {/* Left: Editor */}
      <div className="space-y-4 lg:col-span-8">
        {/* Selected article banner */}
        <Card padding="sm">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] uppercase tracking-wider text-muted-dim">Drafting for</p>
              <h3 className="truncate text-sm font-semibold text-cream">{selectedArticle.title}</h3>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-xs text-muted">{selectedArticle.source}</span>
                {selectedArticle.content_intelligence?.topic && (
                  <Badge variant="muted" size="sm">
                    {selectedArticle.content_intelligence.topic}
                  </Badge>
                )}
                {selectedArticle.court_name && (
                  <Badge variant="info" size="sm">
                    {selectedArticle.court_name}
                  </Badge>
                )}
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedArticleId(null)
                setTab('news')
              }}
              className="btn-ghost text-xs shrink-0"
            >
              Change
            </button>
          </div>
        </Card>

        {/* Platform selector + batch toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {PLATFORMS.map((p) => (
            <button
              key={p}
              onClick={() => setPlatform(p)}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                platform === p
                  ? 'border-amber/50 bg-amber/10 text-cream shadow-sm'
                  : 'border-stroke/40 bg-panel/40 text-muted hover:border-stroke hover:text-cream'
              }`}
            >
              <PlatformIcon platform={p} size={16} />
              {getPlatformLabel(p)}
            </button>
          ))}
          <button
            onClick={() => setShowBatch(!showBatch)}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${
              showBatch
                ? 'border-success/50 bg-success/10 text-success'
                : 'border-stroke/40 bg-panel/40 text-muted hover:border-stroke hover:text-cream'
            }`}
          >
            <Layers size={16} />
            Batch
          </button>
        </div>

        {/* Batch generate panel */}
        <AnimatePresence>
          {showBatch && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <Card padding="sm">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-dim">
                  Generate for multiple platforms at once
                </p>
                <div className="mb-3 flex flex-wrap gap-2">
                  {PLATFORMS.map((p) => (
                    <button
                      key={p}
                      onClick={() => toggleBatchPlatform(p)}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-all ${
                        batchPlatforms.has(p)
                          ? 'border-success/50 bg-success/10 text-success'
                          : 'border-stroke/30 bg-ink/30 text-muted hover:border-stroke'
                      }`}
                    >
                      {batchPlatforms.has(p) ? (
                        <CheckCircle2 size={14} />
                      ) : (
                        <PlatformIcon platform={p} size={14} />
                      )}
                      {getPlatformLabel(p)}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => batchGenerateMutation.mutate()}
                  disabled={batchPlatforms.size === 0 || batchGenerateMutation.isPending}
                  className="btn-primary w-full"
                >
                  {batchGenerateMutation.isPending ? (
                    <Spinner size={16} label={`Generating ${batchPlatforms.size} drafts...`} />
                  ) : (
                    <>
                      <Sparkles size={16} />
                      Generate {batchPlatforms.size} Draft{batchPlatforms.size !== 1 ? 's' : ''}
                    </>
                  )}
                </button>
                {batchGenerateMutation.data?.errors && batchGenerateMutation.data.errors.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {batchGenerateMutation.data.errors.map((err, i) => (
                      <p key={i} className="flex items-center gap-1.5 text-xs text-danger">
                        <AlertCircle size={12} /> {err}
                      </p>
                    ))}
                  </div>
                )}
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Single generate button */}
        {!showBatch && (
          <button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="btn-primary w-full"
          >
            {generateMutation.isPending ? (
              <Spinner size={16} label="Generating..." />
            ) : (
              <>
                <Sparkles size={16} />
                Generate {getPlatformLabel(platform)} Draft
              </>
            )}
          </button>
        )}

        {/* Editor */}
        <div className="relative">
          <textarea
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            placeholder={`Your ${getPlatformLabel(platform)} draft will appear here after generation...`}
            className="input-field min-h-[320px] resize-y font-mono text-sm leading-relaxed"
          />
          <div className="absolute bottom-3 right-3 flex items-center gap-3 text-[11px] text-muted-dim">
            {platform === 'x' && tweetCount > 0 && (
              <span>
                {tweetCount} tweet{tweetCount !== 1 ? 's' : ''}
              </span>
            )}
            <span>{charCount} chars</span>
          </div>
        </div>

        {/* Action bar */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => saveMutation.mutate()}
            disabled={!selectedDraftId || saveMutation.isPending}
            className="btn-secondary flex-1"
          >
            {saveMutation.isPending ? <Spinner size={16} /> : <Save size={16} />}
            Save Draft
          </button>
          <button
            onClick={() => publishMutation.mutate()}
            disabled={!selectedDraftId || publishMutation.isPending}
            className="btn-primary flex-1"
          >
            {publishMutation.isPending ? <Spinner size={16} /> : <Send size={16} />}
            Publish Now
          </button>
          <button
            onClick={() => setShowSchedule(!showSchedule)}
            disabled={!selectedDraftId}
            className="btn-ghost"
          >
            <Clock size={16} />
            Schedule
          </button>
        </div>

        {/* Schedule picker */}
        <AnimatePresence>
          {showSchedule && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <Card padding="sm">
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-dim">
                      Schedule for
                    </label>
                    <input
                      type="datetime-local"
                      value={scheduleAt}
                      onChange={(e) => setScheduleAt(e.target.value)}
                      className="input-field"
                    />
                  </div>
                  <button
                    onClick={() => scheduleMutation.mutate()}
                    disabled={!scheduleAt || scheduleMutation.isPending}
                    className="btn-primary"
                  >
                    {scheduleMutation.isPending ? <Spinner size={16} /> : <Clock size={16} />}
                    Queue
                  </button>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right: Draft history */}
      <div className="lg:col-span-4">
        <Card>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-dim">
            Draft History
          </h3>
          {!draftsQuery.data?.length ? (
            <p className="text-xs text-muted">No drafts yet. Generate one above.</p>
          ) : (
            <div className="max-h-[500px] space-y-2 overflow-auto pr-1">
              {draftsQuery.data.map((draft) => (
                <button
                  key={draft.id}
                  onClick={() => {
                    setSelectedDraftId(draft.id)
                    setDraftText(draft.body)
                    setPlatform(draft.platform)
                  }}
                  className={`group w-full rounded-xl border p-3 text-left transition-all duration-200 ${
                    selectedDraftId === draft.id
                      ? 'border-amber/50 bg-amber/5'
                      : 'border-stroke/30 bg-ink/30 hover:border-stroke hover:bg-ink/50'
                  }`}
                >
                  <div className="mb-1.5 flex items-center justify-between">
                    <PlatformIcon platform={draft.platform} size={14} showLabel />
                    <ChevronRight
                      size={14}
                      className="text-muted-dim transition-transform group-hover:translate-x-0.5"
                    />
                  </div>
                  <p className="line-clamp-2 text-xs leading-relaxed text-muted">{draft.body}</p>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
