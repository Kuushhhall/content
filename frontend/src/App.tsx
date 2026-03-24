import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { Card } from './components/Card'
import { useStatusSocket } from './hooks/useStatusSocket'
import { api } from './lib/api'
import { useUIStore } from './store/uiStore'
import type { AnalyticsOverview, Draft, TabKey } from './types'

const tabs: { key: TabKey; label: string }[] = [
  { key: 'news', label: 'News Feed' },
  { key: 'studio', label: 'Content Studio' },
  { key: 'scheduler', label: 'Post Scheduler' },
  { key: 'engagement', label: 'Engagement Hub' },
  { key: 'analytics', label: 'Analytics' },
]

function App() {
  const queryClient = useQueryClient()
  const status = useStatusSocket()
  const { tab, setTab, selectedArticleId, setSelectedArticleId, selectedDraftId, setSelectedDraftId } = useUIStore()

  const articlesQuery = useQuery({ queryKey: ['articles'], queryFn: api.listArticles })
  const draftsQuery = useQuery({
    queryKey: ['drafts', selectedArticleId],
    queryFn: () => api.listDrafts(selectedArticleId ?? undefined),
  })
  const schedulesQuery = useQuery({ queryKey: ['schedules'], queryFn: api.listSchedules })
  const commentsQuery = useQuery({ queryKey: ['comments'], queryFn: () => api.listComments() })
  const analyticsQuery = useQuery<AnalyticsOverview>({ queryKey: ['analytics'], queryFn: api.analyticsOverview })

  const [draftPlatform, setDraftPlatform] = useState<Draft['platform']>('linkedin')
  const [draftText, setDraftText] = useState('')
  const [scheduleAt, setScheduleAt] = useState('')

  const ingestMutation = useMutation({
    mutationFn: api.ingest,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['articles'] })
    },
  })

  const generateMutation = useMutation({
    mutationFn: () => {
      if (!selectedArticleId) {
        throw new Error('Select an article first')
      }
      return api.generateDraft(selectedArticleId, draftPlatform)
    },
    onSuccess: async (draft) => {
      setSelectedDraftId(draft.id)
      setDraftText(draft.body)
      await queryClient.invalidateQueries({ queryKey: ['drafts'] })
      setTab('studio')
    },
  })

  const saveDraftMutation = useMutation({
    mutationFn: () => {
      if (!selectedDraftId) {
        throw new Error('Select a draft first')
      }
      return api.updateDraft(selectedDraftId, draftText)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['drafts'] })
    },
  })

  const publishNowMutation = useMutation({
    mutationFn: () => {
      if (!selectedDraftId) {
        throw new Error('Select a draft first')
      }
      return api.publishNow(selectedDraftId)
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['analytics'] }),
        queryClient.invalidateQueries({ queryKey: ['comments'] }),
      ])
    },
  })

  const scheduleMutation = useMutation({
    mutationFn: () => {
      if (!selectedDraftId || !scheduleAt) {
        throw new Error('Select draft and schedule time')
      }
      return api.createSchedule(selectedDraftId, draftPlatform, new Date(scheduleAt).toISOString())
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['schedules'] })
      setTab('scheduler')
    },
  })

  const selectedDraft = useMemo(
    () => draftsQuery.data?.find((d) => d.id === selectedDraftId) ?? draftsQuery.data?.[0] ?? null,
    [draftsQuery.data, selectedDraftId],
  )

  const chartData = useMemo(
    () =>
      Object.entries(analyticsQuery.data?.by_platform ?? {}).map(([platform, count]) => ({
        platform,
        count,
      })),
    [analyticsQuery.data],
  )

  return (
    <main className="mx-auto min-h-screen max-w-[1320px] px-6 py-8 text-cream">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 inline-flex rounded-full border border-amber/40 px-3 py-1 text-xs uppercase tracking-[0.24em] text-amber">
            Legal Content OS
          </p>
          <h1 className="font-serif text-4xl leading-tight text-cream md:text-5xl">
            Editorial Pipeline for Legal Thought Leadership
          </h1>
          <p className="mt-3 max-w-3xl text-sm text-muted md:text-base">
            Ideal flow: ingest legal news, craft platform-native drafts, schedule or publish instantly, monitor
            engagement, and evaluate outcomes.
          </p>
        </div>
        <StatusPill
          articles={status?.articles ?? 0}
          drafts={status?.drafts ?? 0}
          pendingSchedules={status?.pendingSchedules ?? 0}
          autoReplyEnabled={status?.autoReplyEnabled ?? false}
        />
      </header>

      <nav className="mb-6 flex flex-wrap gap-2">
        {tabs.map((item) => {
          const active = tab === item.key
          return (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`rounded-xl border px-4 py-2 text-sm transition ${
                active
                  ? 'border-amber bg-amber/20 text-cream'
                  : 'border-stroke bg-panel/60 text-muted hover:border-amber/50 hover:text-cream'
              }`}
            >
              {item.label}
            </button>
          )
        })}
      </nav>

      <section className="grid gap-5 lg:grid-cols-12">
        <motion.div layout className="space-y-5 lg:col-span-7">
          {(tab === 'news' || tab === 'studio') && (
            <Card>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-serif text-2xl">News Feed</h2>
                <button
                  onClick={() => ingestMutation.mutate()}
                  className="rounded-lg border border-amber px-3 py-2 text-xs font-semibold uppercase tracking-wider text-amber hover:bg-amber/15"
                >
                  Refresh Sources
                </button>
              </div>
              <div className="max-h-[520px] space-y-3 overflow-auto pr-1">
                {(articlesQuery.data ?? []).map((article) => (
                  <button
                    key={article.id}
                    onClick={() => {
                      setSelectedArticleId(article.id)
                      setTab('studio')
                    }}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      selectedArticleId === article.id
                        ? 'border-amber bg-amber/10'
                        : 'border-stroke bg-ink/40 hover:border-amber/60'
                    }`}
                  >
                    <p className="text-xs uppercase tracking-wider text-amber">{article.source}</p>
                    <p className="mt-1 text-base font-semibold text-cream">{article.title}</p>
                    <p className="mt-2 line-clamp-2 text-sm text-muted">{article.summary_hint || 'No summary yet'}</p>
                  </button>
                ))}
              </div>
            </Card>
          )}

          {(tab === 'scheduler' || tab === 'news') && (
            <Card>
              <h3 className="mb-4 font-serif text-xl">Upcoming Schedule</h3>
              <div className="space-y-2">
                {(schedulesQuery.data ?? []).slice(0, 6).map((item) => (
                  <div key={item.id} className="rounded-lg border border-stroke bg-ink/35 p-3 text-sm">
                    <p className="font-semibold text-cream">{item.platform.toUpperCase()}</p>
                    <p className="text-muted">{new Date(item.run_at).toLocaleString()}</p>
                    <p className="mt-1 text-xs uppercase tracking-wider text-amber">{item.status}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </motion.div>

        <motion.div layout className="space-y-5 lg:col-span-5">
          {(tab === 'studio' || tab === 'news') && (
            <Card>
              <h2 className="mb-4 font-serif text-2xl">Content Studio</h2>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <select
                  value={draftPlatform}
                  onChange={(event) => setDraftPlatform(event.target.value as Draft['platform'])}
                  className="rounded-lg border border-stroke bg-ink px-3 py-2 text-sm text-cream"
                >
                  <option value="linkedin">LinkedIn</option>
                  <option value="x">X (Twitter)</option>
                  <option value="reddit">Reddit</option>
                  <option value="framer">Framer</option>
                  <option value="medium">Medium</option>
                </select>
                <button
                  onClick={() => generateMutation.mutate()}
                  className="rounded-lg bg-amber px-3 py-2 text-sm font-semibold text-ink"
                >
                  Generate Draft
                </button>
              </div>

              <div className="mb-2 space-y-2">
                {(draftsQuery.data ?? []).slice(0, 5).map((draft) => (
                  <button
                    key={draft.id}
                    onClick={() => {
                      setSelectedDraftId(draft.id)
                      setDraftText(draft.body)
                    }}
                    className={`w-full rounded-lg border p-2 text-left text-sm ${
                      selectedDraftId === draft.id
                        ? 'border-amber bg-amber/10'
                        : 'border-stroke bg-ink/40 hover:border-amber/50'
                    }`}
                  >
                    <span className="font-semibold text-cream">{draft.platform.toUpperCase()}</span>
                    <p className="line-clamp-1 text-muted">{draft.body}</p>
                  </button>
                ))}
              </div>

              <textarea
                value={draftText || selectedDraft?.body || ''}
                onChange={(event) => setDraftText(event.target.value)}
                placeholder="Draft content appears here..."
                className="h-56 w-full rounded-xl border border-stroke bg-ink/50 p-3 text-sm text-cream outline-none focus:border-amber"
              />

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  onClick={() => saveDraftMutation.mutate()}
                  className="rounded-lg border border-amber px-3 py-2 text-sm text-amber hover:bg-amber/15"
                >
                  Save
                </button>
                <button
                  onClick={() => publishNowMutation.mutate()}
                  className="rounded-lg bg-amber px-3 py-2 text-sm font-semibold text-ink"
                >
                  Publish Now
                </button>
              </div>

              <div className="mt-3">
                <label className="mb-1 block text-xs uppercase tracking-wider text-muted">Schedule publish</label>
                <div className="flex gap-2">
                  <input
                    type="datetime-local"
                    value={scheduleAt}
                    onChange={(event) => setScheduleAt(event.target.value)}
                    className="w-full rounded-lg border border-stroke bg-ink px-3 py-2 text-sm"
                  />
                  <button
                    onClick={() => scheduleMutation.mutate()}
                    className="rounded-lg border border-amber px-3 py-2 text-xs uppercase tracking-wider text-amber"
                  >
                    Queue
                  </button>
                </div>
              </div>
            </Card>
          )}

          {(tab === 'engagement' || tab === 'news') && <EngagementCard onRefresh={() => commentsQuery.refetch()} />}

          {(tab === 'analytics' || tab === 'news') && (
            <Card>
              <h2 className="mb-4 font-serif text-2xl">Analytics Dashboard</h2>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Metric label="Total Posts" value={analyticsQuery.data?.total_posts ?? 0} />
                <Metric label="Success Rate" value={`${Math.round((analyticsQuery.data?.success_rate ?? 0) * 100)}%`} />
                <Metric label="Success" value={analyticsQuery.data?.success_posts ?? 0} />
                <Metric label="Failed" value={analyticsQuery.data?.failed_posts ?? 0} />
              </div>

              <div className="mt-4 h-52 rounded-xl border border-stroke bg-ink/30 p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a3457" />
                    <XAxis dataKey="platform" stroke="#a6b0cf" />
                    <YAxis stroke="#a6b0cf" allowDecimals={false} />
                    <Tooltip contentStyle={{ background: '#141a2e', border: '1px solid #2a3457' }} />
                    <Bar dataKey="count" fill="#b9893b" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 h-52 rounded-xl border border-stroke bg-ink/30 p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartData} dataKey="count" nameKey="platform" outerRadius={80} fill="#496eb7" />
                    <Tooltip contentStyle={{ background: '#141a2e', border: '1px solid #2a3457' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}
        </motion.div>
      </section>
    </main>
  )
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-stroke bg-ink/40 p-3">
      <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold text-cream">{value}</p>
    </div>
  )
}

function StatusPill({
  articles,
  drafts,
  pendingSchedules,
  autoReplyEnabled,
}: {
  articles: number
  drafts: number
  pendingSchedules: number
  autoReplyEnabled: boolean
}) {
  return (
    <div className="rounded-2xl border border-stroke bg-panel/80 px-4 py-3 text-xs text-muted">
      <p className="mb-2 uppercase tracking-[0.2em] text-amber">Live status</p>
      <p>Articles: {articles}</p>
      <p>Drafts: {drafts}</p>
      <p>Scheduled: {pendingSchedules}</p>
      <p>Auto-reply: {autoReplyEnabled ? 'ON' : 'OFF'}</p>
    </div>
  )
}

function EngagementCard({ onRefresh }: { onRefresh: () => void }) {
  const queryClient = useQueryClient()
  const commentsQuery = useQuery({ queryKey: ['comments'], queryFn: () => api.listComments() })
  const [replyText, setReplyText] = useState('')
  const firstComment = commentsQuery.data?.[0] ?? null

  const replyMutation = useMutation({
    mutationFn: () => {
      if (!firstComment) {
        throw new Error('No comments available')
      }
      return api.replyComment(firstComment.id, replyText || firstComment.ai_suggested_reply || 'Thanks for engaging.')
    },
    onSuccess: async () => {
      setReplyText('')
      await queryClient.invalidateQueries({ queryKey: ['comments'] })
      onRefresh()
    },
  })

  const toggleMutation = useMutation({
    mutationFn: () => api.toggleAutoReply(true),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['comments'] })
      onRefresh()
    },
  })

  return (
    <Card>
      <h2 className="mb-4 font-serif text-2xl">Engagement Hub</h2>
      {firstComment ? (
        <div className="space-y-3">
          <div className="rounded-lg border border-stroke bg-ink/40 p-3">
            <p className="text-xs uppercase tracking-wider text-amber">{firstComment.platform}</p>
            <p className="mt-1 text-sm font-semibold text-cream">@{firstComment.author}</p>
            <p className="mt-1 text-sm text-muted">{firstComment.text}</p>
            <p className="mt-2 text-xs text-muted">Suggested: {firstComment.ai_suggested_reply ?? 'No suggestion yet'}</p>
          </div>
          <textarea
            value={replyText}
            onChange={(event) => setReplyText(event.target.value)}
            placeholder="Edit suggested reply..."
            className="h-24 w-full rounded-lg border border-stroke bg-ink/50 p-3 text-sm text-cream"
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => replyMutation.mutate()}
              className="rounded-lg bg-amber px-3 py-2 text-sm font-semibold text-ink"
            >
              Send Reply
            </button>
            <button
              onClick={() => toggleMutation.mutate()}
              className="rounded-lg border border-amber px-3 py-2 text-sm text-amber"
            >
              Enable Auto-Reply
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted">No comments yet.</p>
      )}
    </Card>
  )
}

export default App
