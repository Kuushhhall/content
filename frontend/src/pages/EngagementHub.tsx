import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MessageCircle, Send, Sparkles, User, Radar, Filter, Shield, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'

import { Card } from '../components/Card'
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
  const newCount = comments?.items?.filter((c) => c.status === 'new').length ?? 0
  const repliedCount = comments?.items?.filter((c) => c.status === 'replied').length ?? 0

  const filtered = (comments?.items ?? []).filter((c) => {
    if (!filterStatus) return true
    if (filterStatus === 'high_intent' && scanResult) {
      return scanResult.high_intent_ids.includes(c.id)
    }
    return c.status === filterStatus
  })

  const filterOptions = [
    { key: '', label: 'Total Feed', count: comments?.total ?? 0 },
    { key: 'new', label: 'New Intelligence', count: newCount },
    { key: 'replied', label: 'Processed', count: repliedCount },
    ...(scanResult
      ? [{ key: 'high_intent', label: 'Critical Intent', count: scanResult.high_intent }]
      : []),
  ]

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Premium Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div className="flex flex-wrap items-center gap-2">
           {filterOptions.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilterStatus(f.key)}
              className={`flex items-center gap-3 rounded-2xl px-5 py-3 text-sm font-bold transition-all duration-300 ${
                filterStatus === f.key
                  ? 'bg-volt/10 text-volt border border-volt/30 shadow-glow-volt/10'
                  : 'text-dim bg-stellar/40 border border-graphite/40 hover:border-volt/20 hover:text-silver'
              }`}
            >
              <span>{f.label}</span>
              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${filterStatus === f.key ? 'bg-volt text-void' : 'bg-void/40 text-dim'}`}>
                {f.count}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => scanMutation.mutate()}
            disabled={scanMutation.isPending}
            className="btn-secondary h-12 px-6"
          >
            {scanMutation.isPending ? <Spinner size={18} /> : <Radar size={18} />}
            <span>Re-Scan Matrix</span>
          </button>

          <button
            onClick={() => toggleAutoReply.mutate(!autoReplyEnabled)}
            disabled={toggleAutoReply.isPending}
            className={`flex items-center gap-3 rounded-2xl border px-6 py-3 text-sm font-bold transition-all duration-300 shadow-lg ${
              autoReplyEnabled
                ? 'border-success/40 bg-success/10 text-success shadow-success/10'
                : 'border-graphite/40 bg-stellar/40 text-dim hover:text-silver'
            }`}
          >
            {toggleAutoReply.isPending ? <Spinner size={18} /> : <Shield size={18} />}
            <span>Protocol: {autoReplyEnabled ? 'AUTO' : 'MANUAL'}</span>
          </button>
        </div>
      </div>

      {/* Intelligence Banner */}
      {scanResult && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card padding="sm" className="border-volt/30 bg-void/40 backdrop-blur-3xl">
            <div className="flex items-center gap-4 px-4 py-1 text-sm">
              <div className="p-2 rounded-xl bg-volt/10 text-volt">
                <Zap size={20} className="fill-current" />
              </div>
              <div className="flex-1">
                <p className="text-silver font-bold">Signal Processing Complete</p>
                <p className="text-xs text-dim">
                  Detected <strong className="text-volt">{scanResult.high_intent}</strong> priority targets across {scanResult.total_comments} data points.
                </p>
              </div>
              <button
                onClick={() => setFilterStatus('high_intent')}
                className="btn-ghost group text-xs text-volt hover:bg-volt/10 px-4"
              >
                <Filter size={14} className="transition-transform group-hover:scale-110" />
                Focus Analysis
              </button>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Comment matrix */}
      {isLoading ? (
        <SkeletonList count={3} />
      ) : !filtered?.length ? (
        <Card className="py-24">
          <EmptyState
            icon={MessageCircle}
            title="Silence in the Hub"
            description={
              filterStatus
                ? 'No signals matching the selected filter profile.'
                : 'Deploy content to begin intercepting engagement signals.'
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((comment) => {
            const expanded = expandedId === comment.id
            const replyText = replyTexts[comment.id] ?? comment.ai_suggested_reply ?? ''
            const isNew = comment.status === 'new'
            const isReplied = comment.status === 'replied'
            const isHighIntent = scanResult?.high_intent_ids.includes(comment.id)

            return (
              <motion.div
                layout
                key={comment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`group relative ${isHighIntent ? 'z-10' : 'z-0'}`}
              >
                <Card
                  padding="none"
                  className={`overflow-hidden transition-all duration-300 ${
                    isHighIntent ? 'border-volt/40 bg-stellar/50 shadow-glow-volt/5' : 'border-graphite/40 bg-stellar/20'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row">
                    {/* User Metadata */}
                    <div className={`p-6 lg:w-72 border-b lg:border-b-0 lg:border-r border-graphite/40 bg-void/20`}>
                      <div className="flex items-center gap-4 mb-4">
                        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${
                          isHighIntent ? 'border-volt/30 bg-volt/10 text-volt' : 'border-graphite/40 bg-stellar/40 text-dim'
                        }`}>
                          <User size={24} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-silver truncate">{comment.author}</h4>
                          <span className="text-[10px] font-black uppercase tracking-widest text-dim/60">Contributor</span>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-void/40 border border-graphite/40">
                          <PlatformIcon platform={comment.platform} size={14} showLabel />
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5">
                          <div className={`h-1.5 w-1.5 rounded-full ${isNew ? 'bg-volt animate-pulse shadow-glow-volt' : isReplied ? 'bg-success' : 'bg-dim'}`} />
                          <span className={`text-[10px] font-black uppercase tracking-widest ${isNew ? 'text-volt' : 'text-dim'}`}>{comment.status}</span>
                        </div>
                      </div>
                    </div>

                    {/* Content Section */}
                    <div className="flex-1 flex flex-col">
                      <div className="p-8 flex-1">
                        <div className="flex items-center justify-between mb-4">
                           {isHighIntent && (
                            <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-volt text-void text-[10px] font-black uppercase tracking-widest">
                               <Zap size={12} className="fill-current" /> High Intent Match
                            </div>
                           )}
                           <span className="text-[10px] font-bold text-dim/60 ml-auto">
                            {new Date(comment.created_at).toLocaleDateString()} at {new Date(comment.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                           </span>
                        </div>
                        <p className="text-silver/90 text-lg leading-relaxed font-serif italic">"{comment.text}"</p>
                      </div>

                      {/* AI Response Preview / Editor */}
                      <AnimatePresence>
                        {(isNew || expanded) && (
                          <motion.div 
                            initial={{ height: 0 }}
                            animate={{ height: 'auto' }}
                            className="bg-void/40 border-t border-graphite/40 p-6"
                          >
                             {!expanded ? (
                               <div className="flex items-center justify-between gap-6">
                                  {comment.ai_suggested_reply && (
                                     <div className="flex-1 flex items-start gap-3">
                                        <Sparkles size={16} className="text-volt mt-1 shrink-0" />
                                        <p className="text-xs text-dim line-clamp-1 italic">Suggested: {comment.ai_suggested_reply}</p>
                                     </div>
                                  )}
                                  <button
                                    onClick={() => setExpandedId(comment.id)}
                                    className="btn-primary h-10 px-6 text-xs whitespace-nowrap shadow-glow-volt/10"
                                  >
                                    <Send size={14} /> Elaborate Response
                                  </button>
                               </div>
                             ) : (
                               <div className="space-y-4">
                                 <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-volt/80">Response Synthesis</span>
                                    {comment.ai_suggested_reply && (
                                      <button
                                        onClick={() => setReplyTexts(prev => ({ ...prev, [comment.id]: comment.ai_suggested_reply! }))}
                                        className="text-[10px] font-bold text-volt hover:underline"
                                      >
                                        Use AI Blueprint
                                      </button>
                                    )}
                                 </div>
                                 <textarea
                                   value={replyText}
                                   onChange={(e) => setReplyTexts(prev => ({ ...prev, [comment.id]: e.target.value }))}
                                   placeholder="Finalize engagement protocol..."
                                   className="input-field min-h-[120px] bg-void/50 border-volt/20 focus:border-volt/50 text-sm font-sans"
                                 />
                                 <div className="flex items-center justify-end gap-3 pt-2">
                                    <button onClick={() => setExpandedId(null)} className="btn-ghost text-xs">Decline</button>
                                    <button
                                      disabled={!replyText.trim() || replyMutation.isPending}
                                      onClick={() => replyMutation.mutate({ id: comment.id, text: replyText })}
                                      className="btn-primary h-10 px-8 text-xs font-black"
                                    >
                                       {replyMutation.isPending ? <Spinner size={14} /> : <Zap size={14} className="fill-current" />}
                                       Authorize & Deploy
                                    </button>
                                 </div>
                               </div>
                             )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
