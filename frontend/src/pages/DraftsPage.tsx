import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, Check, Play, Clock, Trash2, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'

import { Card } from '../components/Card'
import { Badge } from '../components/Badge'
import { Spinner } from '../components/Spinner'
import { EmptyState } from '../components/EmptyState'
import { PlatformIcon, getPlatformLabel } from '../components/PlatformIcon'
import { api } from '../lib/api'
import { useUIStore } from '../store/uiStore'
import type { Draft } from '../types'

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, '')

function DraftCard({ draft }: { draft: Draft }) {
  const isDarkMode = useUIStore((s) => s.isDarkMode)
  const [copied, setCopied] = useState(false)
  const [copiedTweet, setCopiedTweet] = useState<number | null>(null)
  const queryClient = useQueryClient()

  const isFramer = draft.platform === 'framer'
  const isX = draft.platform === 'x'
  const isLinkedin = draft.platform === 'linkedin'

  const plainText = isFramer ? (() => {
    try {
      const data = JSON.parse(draft.body)
      return `${data.title || ''}\n\n${data.excerpt || ''}\n\n${stripHtml(data.content || '')}`
    } catch {
      return stripHtml(draft.body)
    }
  })() : stripHtml(draft.body)

  const tweets = isX ? plainText.split('---').map(t => t.trim()).filter(Boolean) : []

  const publishMut = useMutation({
    mutationFn: () => api.publishNow(draft.id),
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Published to Framer!')
        queryClient.invalidateQueries({ queryKey: ['drafts'] })
      } else {
        toast.error(`Publish failed: ${result.message}`)
      }
    },
    onError: (err) => toast.error((err as Error).message),
  })

  const deleteMut = useMutation({
    mutationFn: () => api.deleteDraft(draft.id),
    onSuccess: () => {
      toast.success('Draft deleted')
      queryClient.invalidateQueries({ queryKey: ['drafts'] })
    },
    onError: (err) => toast.error((err as Error).message),
  })

  const scheduleMut = useMutation({
    mutationFn: (runAt: string) => api.createSchedule(draft.id, draft.platform, runAt),
    onSuccess: () => {
      toast.success('Post scheduled!')
      queryClient.invalidateQueries({ queryKey: ['schedules'] })
    },
    onError: (err) => toast.error((err as Error).message),
  })

  const [showSchedule, setShowSchedule] = useState(false)
  const [scheduleTime, setScheduleTime] = useState('')

  const copyAll = () => {
    navigator.clipboard.writeText(plainText)
    setCopied(true)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  const copyTweet = (idx: number) => {
    navigator.clipboard.writeText(tweets[idx])
    setCopiedTweet(idx)
    toast.success(`Tweet ${idx + 1} copied`)
    setTimeout(() => setCopiedTweet(null), 2000)
  }

  const copyAllTweets = () => {
    navigator.clipboard.writeText(tweets.join('\n\n---\n\n'))
    setCopied(true)
    toast.success('All tweets copied')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card padding="none" className="overflow-hidden group hover:border-volt/30 transition-all duration-300">
      <div className="flex flex-col">
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${isDarkMode ? 'border-graphite/40 bg-stellar/20' : 'border-graphite/20 bg-stellar/30'}`}>
          <div className="flex items-center gap-3">
            <PlatformIcon platform={draft.platform} size={20} />
            <span className="text-sm font-bold text-silver">{getPlatformLabel(draft.platform)}</span>
            <Badge variant="volt" size="sm">{draft.platform}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSchedule(!showSchedule)}
              className={`p-2 rounded-lg transition-all ${isDarkMode ? 'text-dim hover:text-volt hover:bg-white/5' : 'text-slate-400 hover:text-volt hover:bg-slate-100'}`}
              title="Schedule"
            >
              <Clock size={16} />
            </button>
            {isFramer && (
              <button
                onClick={() => publishMut.mutate()}
                disabled={publishMut.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-volt text-void text-xs font-bold rounded-lg hover:bg-volt/90 transition-all"
              >
                {publishMut.isPending ? <Spinner size={12} /> : <Play size={14} />}
                Publish
              </button>
            )}
            <button
              onClick={() => deleteMut.mutate()}
              disabled={deleteMut.isPending}
              className={`p-2 rounded-lg transition-all ${isDarkMode ? 'text-dim hover:text-danger hover:bg-danger/10' : 'text-slate-400 hover:text-danger hover:bg-red-50'}`}
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {draft.summary && (
            <p className={`text-xs font-medium mb-2 ${isDarkMode ? 'text-dim' : 'text-slate-500'}`}>
              {draft.summary}
            </p>
          )}

          {isX && tweets.length > 0 ? (
            <div className="space-y-3">
              {tweets.map((tweet, idx) => (
                <div key={idx} className={`rounded-lg p-3 border ${isDarkMode ? 'border-graphite/40 bg-void/30' : 'border-slate-200 bg-slate-50'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-black uppercase tracking-wider ${isDarkMode ? 'text-dim' : 'text-slate-400'}`}>
                      Tweet {idx + 1}/{tweets.length} ({tweet.length}/280)
                    </span>
                    <button
                      onClick={() => copyTweet(idx)}
                      className={`p-1 rounded transition-all ${isDarkMode ? 'text-dim hover:text-volt' : 'text-slate-400 hover:text-volt'}`}
                    >
                      {copiedTweet === idx ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                    </button>
                  </div>
                  <p className={`text-sm whitespace-pre-wrap ${isDarkMode ? 'text-silver' : 'text-slate-800'}`}>{tweet}</p>
                </div>
              ))}
              <button
                onClick={copyAllTweets}
                className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg border text-xs font-bold uppercase tracking-wider transition-all ${
                  isDarkMode ? 'border-volt/30 text-volt hover:bg-volt hover:text-void' : 'border-volt/30 text-volt hover:bg-volt hover:text-white'
                }`}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                Copy All Tweets
              </button>
            </div>
          ) : (
            <div>
              <div className={`rounded-lg p-4 max-h-64 overflow-auto text-sm whitespace-pre-wrap leading-relaxed ${
                isDarkMode ? 'bg-void/30 text-silver' : 'bg-slate-50 text-slate-800'
              }`}>
                {isFramer ? (
                  <>
                    {(() => {
                      try {
                        const data = JSON.parse(draft.body)
                        return (
                          <div>
                            <p className="font-bold text-base mb-2">{data.title || 'No title'}</p>
                            <p className={`text-sm mb-4 ${isDarkMode ? 'text-dim' : 'text-slate-500'}`}>{data.excerpt || ''}</p>
                            <div dangerouslySetInnerHTML={{ __html: data.content || '' }} className="prose prose-sm max-w-none" />
                          </div>
                        )
                      } catch {
                        return <p>{stripHtml(draft.body)}</p>
                      }
                    })()}
                  </>
                ) : (
                  <p>{plainText}</p>
                )}
              </div>
              <button
                onClick={copyAll}
                className={`mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-lg border text-xs font-bold uppercase tracking-wider transition-all ${
                  isDarkMode ? 'border-volt/30 text-volt hover:bg-volt hover:text-void' : 'border-volt/30 text-volt hover:bg-volt hover:text-white'
                }`}
              >
                {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                {isLinkedin ? 'Copy to Clipboard' : isFramer ? 'Copy Content' : 'Copy'}
              </button>
            </div>
          )}

          {/* Schedule interface */}
          <AnimatePresence>
            {showSchedule && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={`mt-4 pt-4 border-t ${isDarkMode ? 'border-graphite/40' : 'border-slate-200'}`}
              >
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${isDarkMode ? 'text-amethyst' : 'text-violet-700'}`}>
                      Schedule (IST)
                    </label>
                    <input
                      type="datetime-local"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className={`w-full h-10 px-3 rounded-lg border outline-none text-sm font-bold ${
                        isDarkMode ? 'bg-void border-amethyst/20 text-silver focus:border-amethyst' : 'bg-white border-slate-200 text-slate-900 focus:border-violet-500'
                      }`}
                    />
                  </div>
                  <button
                    onClick={() => {
                      if (!scheduleTime) { toast.error('Select a time'); return }
                      // Convert local datetime to IST (UTC+5:30)
                      const localDate = new Date(scheduleTime)
                      const istOffset = 5.5 * 60 * 60 * 1000
                      const utcDate = new Date(localDate.getTime() - (localDate.getTimezoneOffset() * 60 * 1000))
                      const istDate = new Date(utcDate.getTime() + istOffset)
                      scheduleMut.mutate(istDate.toISOString())
                    }}
                    disabled={scheduleMut.isPending}
                    className="h-10 px-4 bg-amethyst text-white text-xs font-bold rounded-lg hover:bg-amethyst/90 transition-all"
                  >
                    {scheduleMut.isPending ? <Spinner size={14} /> : 'Schedule'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Card>
  )
}

export function DraftsPage() {
  const isDarkMode = useUIStore((s) => s.isDarkMode)
  const [filter, setFilter] = useState<string>('all')

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['drafts', filter],
    queryFn: () => api.listDrafts(filter === 'all' ? undefined : filter),
  })

  const drafts = data?.items ?? []

  const platformCounts = {
    all: drafts.length,
    linkedin: drafts.filter(d => d.platform === 'linkedin').length,
    x: drafts.filter(d => d.platform === 'x').length,
    framer: drafts.filter(d => d.platform === 'framer').length,
  }

  const filters = [
    { key: 'all', label: 'All', count: platformCounts.all },
    { key: 'linkedin', label: 'LinkedIn', count: platformCounts.linkedin },
    { key: 'x', label: 'X', count: platformCounts.x },
    { key: 'framer', label: 'Framer', count: platformCounts.framer },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-black text-main">Drafts</h1>
          <p className="text-sm text-muted mt-1">{drafts.length} drafts across all platforms</p>
        </div>
        <button
          onClick={() => refetch()}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all ${
            isDarkMode ? 'border-volt/30 text-volt hover:bg-volt/10' : 'border-volt/30 text-volt hover:bg-volt/5'
          }`}
        >
          <Sparkles size={14} /> Refresh
        </button>
      </div>

      {/* Platform filters */}
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all ${
              filter === f.key
                ? 'bg-volt/10 text-volt border border-volt/30'
                : isDarkMode
                  ? 'border-graphite/40 bg-stellar/20 text-dim hover:text-silver'
                  : 'border-slate-200 bg-white text-slate-400 hover:text-slate-900'
            }`}
          >
            {f.key !== 'all' && <PlatformIcon platform={f.key} size={14} />}
            <span>{f.label}</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${filter === f.key ? 'bg-volt text-void' : isDarkMode ? 'bg-void/40 text-dim' : 'bg-slate-100 text-slate-400'}`}>
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {/* Drafts list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Spinner size={32} />
        </div>
      ) : drafts.length === 0 ? (
        <Card className="py-24">
          <EmptyState
            icon={Sparkles}
            title="No Drafts Yet"
            description="Run a content cycle from the Dashboard to generate drafts."
          />
        </Card>
      ) : (
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {drafts.map((draft) => (
              <motion.div
                key={draft.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <DraftCard draft={draft} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
