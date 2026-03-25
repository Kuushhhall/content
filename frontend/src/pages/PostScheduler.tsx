import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Calendar, Trash2, Clock, CheckCircle2, XCircle, AlertCircle, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'

import { Card } from '../components/Card'
import { Badge } from '../components/Badge'
import { Spinner } from '../components/Spinner'
import { EmptyState } from '../components/EmptyState'
import { SkeletonList } from '../components/Skeleton'
import { PlatformIcon, getPlatformLabel } from '../components/PlatformIcon'
import { api } from '../lib/api'

type StatusFilter = '' | 'pending' | 'completed' | 'failed' | 'cancelled'

const statusConfig: Record<string, { variant: 'amber' | 'success' | 'danger' | 'muted' | 'info'; icon: React.ElementType; color: string; bg: string }> = {
  pending: { variant: 'amber', icon: Clock, color: 'text-volt', bg: 'bg-volt/10 border-volt/20' },
  running: { variant: 'info', icon: AlertCircle, color: 'text-info', bg: 'bg-info/10 border-info/20' },
  completed: { variant: 'success', icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10 border-success/20' },
  failed: { variant: 'danger', icon: XCircle, color: 'text-danger', bg: 'bg-danger/10 border-danger/20' },
  cancelled: { variant: 'muted', icon: XCircle, color: 'text-dim', bg: 'bg-graphite/20 border-graphite/20' },
}

export function PostScheduler() {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<StatusFilter>('')
  const [search, setSearch] = useState('')

  const { data: schedules, isLoading } = useQuery({
    queryKey: ['schedules'],
    queryFn: api.listSchedules,
  })

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.cancelSchedule(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['schedules'] })
      toast.success('Schedule cancelled')
    },
    onError: () => toast.error('Failed to cancel schedule'),
  })

  const filtered = (schedules ?? []).filter((s) => {
    const matchesFilter = !filter || s.status === filter
    const matchesSearch = !search || 
      getPlatformLabel(s.platform).toLowerCase().includes(search.toLowerCase()) ||
      s.content_preview?.toLowerCase().includes(search.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const counts = {
    all: schedules?.length ?? 0,
    pending: schedules?.filter((s) => s.status === 'pending').length ?? 0,
    completed: schedules?.filter((s) => s.status === 'completed').length ?? 0,
    failed: schedules?.filter((s) => s.status === 'failed').length ?? 0,
  }

  const filters: { key: StatusFilter; label: string; count: number }[] = [
    { key: '', label: 'All Operations', count: counts.all },
    { key: 'pending', label: 'Queued', count: counts.pending },
    { key: 'completed', label: 'Deployed', count: counts.completed },
    { key: 'failed', label: 'Failed', count: counts.failed },
  ]

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex items-center gap-3 rounded-2xl px-5 py-3 text-sm font-bold transition-all duration-300 ${
                filter === f.key
                  ? 'bg-volt/10 text-volt border border-volt/30 shadow-glow-volt/10'
                  : 'text-dim bg-stellar/40 border border-graphite/40 hover:border-volt/20 hover:text-silver'
              }`}
            >
              <span>{f.label}</span>
              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${filter === f.key ? 'bg-volt text-void' : 'bg-void/40 text-dim'}`}>
                {f.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-[280px] max-w-sm">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-dim" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search manifests..."
            className="input-field pl-12 h-12 bg-stellar/20"
          />
        </div>
      </div>

      {/* Schedule list */}
      {isLoading ? (
        <SkeletonList count={4} />
      ) : filtered.length === 0 ? (
        <Card className="py-24">
          <EmptyState
            icon={Calendar}
            title="Registry Empty"
            description={filter ? `No ${filter} manifests found in the current buffer.` : 'Initialize content cycles to populate the deployment registry.'}
          />
        </Card>
      ) : (
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((schedule) => {
              const sc = statusConfig[schedule.status] ?? statusConfig.pending
              const StatusIcon = sc.icon
              const isPast = new Date(schedule.run_at) < new Date()

              return (
                <motion.div
                  layout
                  key={schedule.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card padding="none" className="overflow-hidden group hover:border-volt/30 transition-all duration-300">
                    <div className="flex flex-col md:flex-row md:items-center">
                      {/* Left: Indicator & Platform */}
                      <div className={`flex items-center gap-6 p-6 md:w-80 border-r border-graphite/40 bg-stellar/20`}>
                        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border ${sc.bg} ${sc.color}`}>
                          <PlatformIcon platform={schedule.platform} size={28} glow={schedule.status === 'pending'} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-lg font-serif font-bold text-silver truncate">
                            {getPlatformLabel(schedule.platform)}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[10px] font-black uppercase tracking-widest ${sc.color}`}>{schedule.status}</span>
                            <div className={`h-1 w-1 rounded-full ${sc.color.replace('text-', 'bg-')}`} />
                          </div>
                        </div>
                      </div>

                      {/* Middle: Timing & Content */}
                      <div className="flex-1 p-6 flex flex-col justify-center">
                        <div className="flex items-center gap-3 text-dim mb-2">
                           <Clock size={16} className="text-volt" />
                           <span className="text-sm font-bold text-silver/80">
                             {new Date(schedule.run_at).toLocaleString(undefined, { 
                               weekday: 'short', 
                               month: 'short', 
                               day: 'numeric', 
                               hour: '2-digit', 
                               minute: '2-digit' 
                             })}
                           </span>
                           {isPast && schedule.status === 'pending' && (
                             <Badge variant="amber" size="sm" className="bg-volt/10 text-volt border-volt/20">Manifest Delayed</Badge>
                           )}
                        </div>
                        {schedule.content_preview ? (
                          <p className="text-xs text-dim leading-relaxed line-clamp-1 italic">
                            "{schedule.content_preview}"
                          </p>
                        ) : (
                          <div className="h-4 w-48 bg-graphite/20 rounded animate-pulse" />
                        )}
                        {schedule.error && (
                          <div className="mt-3 flex items-center gap-2 text-xs font-bold text-danger bg-danger/5 border border-danger/10 p-2 rounded-lg">
                            <AlertCircle size={14} /> {schedule.error}
                          </div>
                        )}
                      </div>

                      {/* Right: Actions */}
                      <div className="p-6 md:pl-0 flex items-center gap-3 justify-end">
                        <StatusIcon size={24} className={`${sc.color} opacity-20 group-hover:opacity-100 transition-opacity`} />
                        
                        {schedule.status === 'pending' && (
                          <button
                            onClick={() => cancelMutation.mutate(schedule.id)}
                            disabled={cancelMutation.isPending}
                            className="h-12 w-12 flex items-center justify-center rounded-xl bg-void/40 border border-graphite/40 text-dim hover:text-danger hover:border-danger/30 hover:bg-danger/5 transition-all"
                            title="Abort manifest"
                          >
                            {cancelMutation.isPending ? <Spinner size={18} /> : <Trash2 size={18} />}
                          </button>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
