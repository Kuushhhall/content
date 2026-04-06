import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { RotateCcw, Clock, CheckCircle2, XCircle, FileText, RefreshCw, Pause, PlayCircle, SkipForward, RotateCcwIcon, Eye, ExternalLink, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'

import { Card } from '../components/Card'
import { api } from '../lib/api'
import { useUIStore } from '../store/uiStore'

interface QueueItem {
  time: string
  platform: string
  action: string
  title: string | null
  draft_id: string | null
}

interface PostedItem {
  draft_id: string
  title: string
  platform: string
  posted_at: string
  external_id: string | null
  error: string | null
}

interface AutomationStatus {
  cycle_id: string | null
  started_at: string | null
  status: string
  is_paused: boolean
  queue: QueueItem[]
  posted: PostedItem[]
  failed: PostedItem[]
  cleared_at: string | null
  total_drafts: number
  linkedin_drafts: number
  linkedin_article_drafts: number
  framer_drafts: number
  x_drafts: number
}

export function AutomationDashboard() {
  const isDarkMode = useUIStore((state) => state.isDarkMode)
  const [previewDraft, setPreviewDraft] = useState<{id: string, title: string, body: string, platform: string} | null>(null)
  const [activeTab, setActiveTab] = useState<'timeline' | 'queue' | 'posted' | 'failed'>('timeline')

  const { data: status, refetch, isFetching } = useQuery<AutomationStatus>({
    queryKey: ['automation-status'],
    queryFn: () => api.getAutomationStatus(),
    refetchInterval: 5000,
  })

  const startCycleMut = useMutation({
    mutationFn: api.startAutomationCycleWithCatchup,
    onSuccess: () => {
      toast.success('Cycle started! (With catch-up if past 10 AM)')
      refetch()
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  const pauseCycleMut = useMutation({
    mutationFn: api.pauseAutomationCycle,
    onSuccess: () => {
      toast.success('Cycle paused')
      refetch()
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  const resumeCycleMut = useMutation({
    mutationFn: api.resumeAutomationCycle,
    onSuccess: () => {
      toast.success('Cycle resumed')
      refetch()
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  const skipPostMut = useMutation({
    mutationFn: api.skipAutomationPost,
    onSuccess: () => {
      toast.success('Post skipped')
      refetch()
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  const retryPostMut = useMutation({
    mutationFn: api.retryAutomationPost,
    onSuccess: () => {
      toast.success('Retrying failed post...')
      refetch()
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  const clearCycleMut = useMutation({
    mutationFn: api.clearAutomationCycle,
    onSuccess: () => {
      toast.success('Cycle cleared!')
      refetch()
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  const resetMut = useMutation({
    mutationFn: api.fullReset,
    onSuccess: () => {
      toast.success('Full reset complete!')
      refetch()
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  const fetchAndStartMut = useMutation({
    mutationFn: api.fetchNewsAndStart,
    onSuccess: (data) => {
      toast.success(`News fetched! Cycle: ${data.cycle_id?.substring(0,15)}...`)
      refetch()
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  const postNowMut = useMutation({
    mutationFn: api.postNowOverride,
    onSuccess: (data) => {
      toast.success(`Posted ${data.posts_published} items immediately!`)
      refetch()
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  const executeActionMut = useMutation({
    mutationFn: ({ time, platform, action }: { time: string; platform: string; action: string }) => 
      api.executeAutomationAction(time, platform, action),
    onSuccess: () => {
      toast.success('Action executed!')
      refetch()
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  const postSpecificDraft = (draftId: string) => {
    api.postSpecificDraft(draftId)
      .then(() => {
        toast.success('Draft posted!')
        refetch()
      })
      .catch((err: Error) => {
        toast.error(err.message)
      })
  }

  const queue = status?.queue || []
  const posted = status?.posted || []
  const failed = status?.failed || []
  const cycleStatus = status?.status || 'idle'
  const isPaused = status?.is_paused || false

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'linkedin': 
        return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
      case 'linkedin_article':
        return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
      case 'framer': return <FileText size={16} />
      case 'x':
      case 'twitter': 
        return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
      case 'pipeline': return <RefreshCw size={16} />
      default: return <FileText size={16} />
    }
  }

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'linkedin': return 'text-blue-400 bg-blue-400/10'
      case 'linkedin_article': return 'text-indigo-400 bg-indigo-400/10'
      case 'framer': return 'text-purple-400 bg-purple-400/10'
      case 'x':
      case 'twitter': return 'text-sky-400 bg-sky-400/10'
      case 'pipeline': return 'text-volt bg-volt/10'
      default: return 'text-gray-400 bg-gray-400/10'
    }
  }

  const getStatusBadge = () => {
    if (isPaused) {
      return <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-sm font-bold">
        <Pause size={14} /> Paused
      </span>
    }
    switch (cycleStatus) {
      case 'running':
        return <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-volt/20 text-volt text-sm font-bold">
          <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} /> Running
        </span>
      case 'completed':
        return <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-success/20 text-success text-sm font-bold">
          <CheckCircle2 size={14} /> Completed
        </span>
      case 'failed':
        return <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-danger/20 text-danger text-sm font-bold">
          <XCircle size={14} /> Failed
        </span>
      default:
        return <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-graphite/20 text-muted text-sm font-bold">
          <Pause size={14} /> Idle
        </span>
    }
  }

  const linkedinPosted = posted.filter(p => p.platform === 'linkedin').length
  const linkedinArticlePosted = posted.filter(p => p.platform === 'linkedin_article').length
  const framerPosted = posted.filter(p => p.platform === 'framer').length
  const xPosted = posted.filter(p => p.platform === 'x').length
  const linkedinTotal = status?.linkedin_drafts || 0
  const linkedinArticleTotal = status?.linkedin_article_drafts || 0
  const framerTotal = status?.framer_drafts || 0
  const xTotal = status?.x_drafts || 0

  const handlePreview = async (draftId: string) => {
    try {
      const data = await api.getDraftContent(draftId)
      if (data.success) {
        setPreviewDraft({
          id: data.draft.id,
          title: data.draft.title || 'Untitled',
          body: data.draft.body,
          platform: data.draft.platform
        })
      }
    } catch {
      toast.error('Failed to load draft')
    }
  }

  const timelineItems = [
    ...queue.map((q, i) => ({ ...q, status: 'pending' as const, index: i })),
    ...posted.map(p => ({ time: new Date(p.posted_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }), platform: p.platform, title: p.title, action: 'post', status: 'completed' as const, draft_id: p.draft_id })),
    ...failed.map(f => ({ time: 'Failed', platform: f.platform, title: f.title, action: 'post', status: 'failed' as const, draft_id: f.draft_id }))
  ]

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <section className={`rounded-3xl border p-6 ${isDarkMode ? 'border-graphite/40 bg-stellar/10' : 'border-graphite/20 bg-cream'}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="font-serif text-3xl font-black text-main">Automation</h1>
              {getStatusBadge()}
            </div>
            <p className="text-sm text-muted">
              Cycle: {status?.cycle_id?.substring(0, 20) || 'None'} • 
              Started: {status?.started_at ? new Date(status.started_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {cycleStatus === 'running' && !isPaused && (
              <button onClick={() => pauseCycleMut.mutate()} className="flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-bold hover:bg-yellow-500/10">
                <Pause size={16} /> Pause
              </button>
            )}
            {isPaused && (
              <button onClick={() => resumeCycleMut.mutate()} className="flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-bold bg-volt text-void">
                <PlayCircle size={16} /> Resume
              </button>
            )}
            <button
              onClick={() => skipPostMut.mutate()}
              disabled={cycleStatus !== 'running' || isPaused || queue.length === 0}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-bold disabled:opacity-50"
            >
              <SkipForward size={16} /> Skip
            </button>
            <button
              onClick={() => startCycleMut.mutate()}
              disabled={cycleStatus === 'running'}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold bg-volt text-void disabled:opacity-50"
            >
              <RotateCcw size={16} /> Start
            </button>
            <button
              onClick={() => clearCycleMut.mutate()}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-bold text-danger border-danger/30 hover:bg-danger/10"
            >
              <XCircle size={16} /> Clear
            </button>
            <button
              onClick={() => {
                if (confirm('Full reset will clear ALL data. Continue?')) {
                  resetMut.mutate()
                }
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-bold text-danger border-danger/30 hover:bg-danger/10"
            >
              <RotateCcwIcon size={16} /> Reset All
            </button>
            <button
              onClick={() => fetchAndStartMut.mutate()}
              disabled={cycleStatus === 'running'}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold bg-success text-white disabled:opacity-50"
            >
              <RefreshCw size={16} /> Fetch & Start
            </button>
            <button
              onClick={() => postNowMut.mutate()}
              disabled={postNowMut.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold bg-danger text-white disabled:opacity-50"
            >
              {postNowMut.isPending ? <RefreshCw size={16} className="animate-spin" /> : <PlayCircle size={16} />} Post Now
            </button>
          </div>
        </div>
      </section>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Total Drafts" value={status?.total_drafts || 0} />
        <StatCard label="LinkedIn Post" value={`${linkedinPosted}/${linkedinTotal}`} color="blue" />
        <StatCard label="LinkedIn Article" value={`${linkedinArticlePosted}/${linkedinArticleTotal}`} color="indigo" />
        <StatCard label="Framer" value={`${framerPosted}/${framerTotal}`} color="purple" />
        <StatCard label="X/Twitter" value={`${xPosted}/${xTotal}`} color="sky" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-graphite/20 pb-2 overflow-x-auto">
        {[
          { id: 'timeline', label: 'Timeline', icon: Clock },
          { id: 'queue', label: 'Queue', icon: SkipForward },
          { id: 'posted', label: 'Posted', icon: CheckCircle2 },
          { id: 'failed', label: 'Failed', icon: AlertTriangle },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-bold transition-colors ${
              activeTab === tab.id 
                ? 'bg-volt/10 text-volt border-b-2 border-volt' 
                : 'text-muted hover:text-main'
            }`}
          >
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Timeline View */}
      {activeTab === 'timeline' && (
        <Card>
          <h3 className="text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2">
            <Clock size={16} /> TODAY'S TIMELINE
          </h3>
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-graphite/20" />
            <div className="space-y-4">
              {timelineItems.slice(0, 8).map((item, idx) => (
                <div key={idx} className="flex items-start gap-4 relative">
                  <div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full ${
                    item.status === 'completed' ? 'bg-success text-white' :
                    item.status === 'failed' ? 'bg-danger text-white' :
                    item.status === 'pending' ? 'bg-graphite/30 text-muted' : 'bg-volt text-void'
                  }`}>
                    {item.status === 'completed' ? <CheckCircle2 size={16} /> :
                     item.status === 'failed' ? <XCircle size={16} /> :
                     <span className="text-xs font-bold">{idx + 1}</span>}
                  </div>
                  <div className={`flex-1 p-3 rounded-xl border ${
                    isDarkMode ? 'border-graphite/40 bg-void/20' : 'border-graphite/20 bg-stellar/30'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted w-14">{item.time}</span>
                        <span className={`p-1 rounded ${getPlatformColor(item.platform)}`}>
                          {getPlatformIcon(item.platform)}
                        </span>
                        <span className="text-sm font-medium text-main truncate max-w-xs">{item.title || item.platform}</span>
                      </div>
                      {item.draft_id && item.status === 'pending' && (
                        <div className="flex gap-1">
                          <button onClick={() => handlePreview(item.draft_id)} className="p-1 hover:bg-graphite/20 rounded" title="Preview">
                            <Eye size={14} />
                          </button>
                          <button 
                            onClick={() => postSpecificDraft(item.draft_id)} 
                            className="p-1 hover:bg-volt/20 rounded text-volt" 
                            title="Post Now"
                          >
                            <PlayCircle size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {queue.length > 0 && (
                <div className="flex items-center gap-4 relative opacity-50">
                  <div className="relative z-10 flex items-center justify-center w-8 h-8 rounded-full bg-graphite/30">
                    <span className="text-xs font-bold text-muted">{timelineItems.length}</span>
                  </div>
                  <span className="text-sm text-muted">+ {queue.length} more scheduled</span>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Queue View */}
      {activeTab === 'queue' && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
              <SkipForward size={16} /> QUEUE ({queue.length})
            </h3>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {queue.length === 0 ? (
              <p className="text-sm text-muted italic py-8 text-center">Queue is empty</p>
            ) : (
              queue.map((item, idx) => (
                <div key={idx} className={`flex items-center justify-between p-3 rounded-xl border ${isDarkMode ? 'border-graphite/40 bg-void/20' : 'border-graphite/20 bg-stellar/30'}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-mono text-muted w-14 shrink-0">{item.time}</span>
                    <span className={`p-1 rounded ${getPlatformColor(item.platform)}`}>{getPlatformIcon(item.platform)}</span>
                    <span className="text-sm font-medium text-main truncate">{item.title || item.platform || item.action}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted capitalize">{item.action}</span>
                    {item.draft_id && (
                      <button onClick={() => handlePreview(item.draft_id)} className="p-1 hover:bg-graphite/20 rounded" title="Preview">
                        <Eye size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* Posted View */}
      {activeTab === 'posted' && (
        <Card>
          <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-4">
            <CheckCircle2 size={16} className="text-success" /> POSTED ({posted.length})
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {posted.length === 0 ? (
              <p className="text-sm text-muted italic py-8 text-center">No posts published yet</p>
            ) : (
              posted.map((item, idx) => (
                <div key={idx} className={`flex items-center justify-between p-3 rounded-xl border ${isDarkMode ? 'border-success/30 bg-success/5' : 'border-success/30 bg-success/5'}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <CheckCircle2 size={14} className="text-success shrink-0" />
                    <span className={`p-1 rounded ${getPlatformColor(item.platform)}`}>{getPlatformIcon(item.platform)}</span>
                    <span className="text-sm font-medium text-main truncate">{item.title}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {item.external_id && (
                      <a href={`https://framer.com/articles/${item.external_id}`} target="_blank" rel="noopener noreferrer" className="text-volt hover:underline">
                        <ExternalLink size={14} />
                      </a>
                    )}
                    <span className="text-xs text-muted">
                      {new Date(item.posted_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* Failed View */}
      {activeTab === 'failed' && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
              <XCircle size={16} className="text-danger" /> FAILED ({failed.length})
            </h3>
            {failed.length > 0 && (
              <button
                onClick={() => retryPostMut.mutate()}
                className="flex items-center gap-2 px-3 py-1 rounded-lg bg-danger/10 text-danger text-sm font-bold hover:bg-danger/20"
              >
                <RotateCcwIcon size={14} /> Retry All
              </button>
            )}
          </div>
          <div className="space-y-2">
            {failed.length === 0 ? (
              <p className="text-sm text-muted italic py-8 text-center">No failed posts</p>
            ) : (
              failed.map((item, idx) => (
                <div key={idx} className={`flex items-center justify-between p-3 rounded-xl border ${isDarkMode ? 'border-danger/30 bg-danger/5' : 'border-danger/30 bg-danger/5'}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <XCircle size={14} className="text-danger shrink-0" />
                    <span className={`p-1 rounded ${getPlatformColor(item.platform)}`}>{getPlatformIcon(item.platform)}</span>
                    <span className="text-sm font-medium text-main truncate">{item.title}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-danger truncate max-w-xs">{item.error}</span>
                    <button
                      onClick={() => retryPostMut.mutate(item.draft_id)}
                      className="p-1 hover:bg-danger/20 rounded text-danger"
                      title="Retry"
                    >
                      <RotateCcwIcon size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* Progress Bars */}
      <Card>
        <h3 className="text-sm font-black uppercase tracking-widest mb-4">TODAY'S PROGRESS</h3>
        <div className="space-y-4">
          <ProgressBar label="LinkedIn Post" current={linkedinPosted} total={linkedinTotal || 2} color="bg-blue-500" />
          <ProgressBar label="LinkedIn Article" current={linkedinArticlePosted} total={linkedinArticleTotal || 2} color="bg-indigo-500" />
          <ProgressBar label="Framer" current={framerPosted} total={framerTotal || 10} color="bg-purple-500" />
          <ProgressBar label="X/Twitter" current={xPosted} total={xTotal || 10} color="bg-sky-500" />
        </div>
      </Card>

      {/* Manual Actions */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-black uppercase tracking-widest">QUICK ACTIONS</h3>
          {cycleStatus === 'running' && (
            <button 
              onClick={() => api.catchUpMissedSchedules().then(() => { toast.success('Catch-up complete!'); refetch(); }).catch(e => toast.error(e.message))}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-volt/10 text-volt text-sm font-bold hover:bg-volt/20"
            >
              <RefreshCw size={14} /> Catch Up
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button onClick={() => executeActionMut.mutate({ time: "now", platform: "linkedin", action: "post" })} disabled={cycleStatus !== 'running' || isPaused} className="flex items-center justify-center gap-2 p-4 rounded-xl border hover:bg-blue-500/10 disabled:opacity-50">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-blue-400"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
            <span className="text-sm font-bold">Post LinkedIn</span>
          </button>
          <button onClick={() => executeActionMut.mutate({ time: "now", platform: "framer", action: "post" })} disabled={cycleStatus !== 'running' || isPaused} className="flex items-center justify-center gap-2 p-4 rounded-xl border hover:bg-purple-500/10 disabled:opacity-50">
            <FileText size={20} className="text-purple-400" />
            <span className="text-sm font-bold">Post Framer</span>
          </button>
          <button onClick={() => executeActionMut.mutate({ time: "now", platform: "x", action: "post" })} disabled={cycleStatus !== 'running' || isPaused} className="flex items-center justify-center gap-2 p-4 rounded-xl border hover:bg-sky-500/10 disabled:opacity-50">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-sky-400"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            <span className="text-sm font-bold">Post X</span>
          </button>
          <button onClick={() => refetch()} className="flex items-center justify-center gap-2 p-4 rounded-xl border hover:bg-graphite/20">
            <RefreshCw size={20} />
            <span className="text-sm font-bold">Refresh</span>
          </button>
        </div>
      </Card>

      {/* Draft Preview Modal */}
      <AnimatePresence>
        {previewDraft && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setPreviewDraft(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`max-w-2xl w-full max-h-[80vh] overflow-y-auto rounded-2xl border p-6 ${
                isDarkMode ? 'bg-void border-graphite/40' : 'bg-cream border-graphite/20'
              }`}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className={`p-2 rounded ${getPlatformColor(previewDraft.platform)}`}>
                    {getPlatformIcon(previewDraft.platform)}
                  </span>
                  <h3 className="font-serif text-xl font-bold text-main">{previewDraft.title}</h3>
                </div>
                <button onClick={() => setPreviewDraft(null)} className="p-2 hover:bg-graphite/20 rounded-lg">
                  <XCircle size={20} />
                </button>
              </div>
              <div className={`p-4 rounded-xl border whitespace-pre-wrap text-sm ${
                isDarkMode ? 'bg-stellar/10 border-graphite/40' : 'bg-stellar/30 border-graphite/20'
              }`}>
                {previewDraft.body}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: string | number; color?: 'blue' | 'purple' | 'sky' }) {
  const isDarkMode = useUIStore((state) => state.isDarkMode)
  const colorClass = color === 'blue' ? 'text-blue-400' : color === 'purple' ? 'text-purple-400' : color === 'sky' ? 'text-sky-400' : 'text-volt'
  
  return (
    <div className={`rounded-2xl border p-4 ${isDarkMode ? 'border-graphite/40 bg-stellar/10' : 'border-graphite/20 bg-cream'}`}>
      <p className={`text-2xl font-serif font-bold tracking-tight mb-1 ${colorClass}`}>{value}</p>
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">{label}</p>
    </div>
  )
}

function ProgressBar({ label, current, total, color }: { label: string; current: number; total: number; color: string }) {
  const percentage = total > 0 ? Math.min((current / total) * 100, 100) : 0
  const isDarkMode = useUIStore((state) => state.isDarkMode)
  
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-main">{label}</span>
        <span className="text-xs text-muted">{current}/{total}</span>
      </div>
      <div className={`h-2 rounded-full ${isDarkMode ? 'bg-graphite/40' : 'bg-graphite/20'} overflow-hidden`}>
        <motion.div
          className={`h-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </div>
  )
}
