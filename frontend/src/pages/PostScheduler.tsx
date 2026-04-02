import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Calendar, Trash2, Clock, CheckCircle2, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'

import { Card } from '../components/Card'
import { Badge } from '../components/Badge'
import { Spinner } from '../components/Spinner'
import { EmptyState } from '../components/EmptyState'
import { PlatformIcon, getPlatformLabel } from '../components/PlatformIcon'
import { api } from '../lib/api'
import { useUIStore } from '../store/uiStore'

const statusConfig: Record<string, { color: string; bg: string; icon: React.ElementType }> = {
  pending: { color: 'text-volt', bg: 'bg-volt/10 border-volt/20', icon: Clock },
  completed: { color: 'text-success', bg: 'bg-success/10 border-success/20', icon: CheckCircle2 },
  failed: { color: 'text-danger', bg: 'bg-danger/10 border-danger/20', icon: XCircle },
  cancelled: { color: 'text-dim', bg: 'bg-graphite/20 border-graphite/20', icon: XCircle },
}

export function PostScheduler() {
  const queryClient = useQueryClient()
  const isDarkMode = useUIStore((s) => s.isDarkMode)
  const [filter, setFilter] = useState<string>('all')

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

  const allSchedules = schedules?.items ?? []
  const filtered = filter === 'all' ? allSchedules : allSchedules.filter(s => s.status === filter)

  const counts = {
    all: allSchedules.length,
    pending: allSchedules.filter(s => s.status === 'pending').length,
    completed: allSchedules.filter(s => s.status === 'completed').length,
    failed: allSchedules.filter(s => s.status === 'failed').length,
  }

  const filters = [
    { key: 'all', label: 'All', count: counts.all },
    { key: 'pending', label: 'Pending', count: counts.pending },
    { key: 'completed', label: 'Completed', count: counts.completed },
    { key: 'failed', label: 'Failed', count: counts.failed },
  ]

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="font-serif text-3xl font-black text-main">Scheduler</h1>
        <p className="text-sm text-muted mt-1">{allSchedules.length} scheduled posts</p>
      </div>

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
            <span>{f.label}</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${filter === f.key ? 'bg-volt text-void' : isDarkMode ? 'bg-void/40 text-dim' : 'bg-slate-100 text-slate-400'}`}>
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24"><Spinner size={32} /></div>
      ) : filtered.length === 0 ? (
        <Card className="py-24">
          <EmptyState
            icon={Calendar}
            title="No Scheduled Posts"
            description="Schedule drafts from the Drafts page to see them here."
          />
        </Card>
      ) : (
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((schedule) => {
              const sc = statusConfig[schedule.status] ?? statusConfig.pending
              const StatusIcon = sc.icon
              const scheduledDate = new Date(schedule.run_at)
              const istDate = new Date(scheduledDate.getTime() + (5.5 * 60 * 60 * 1000))

              return (
                <motion.div
                  layout
                  key={schedule.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card padding="none" className="overflow-hidden group hover:border-volt/30 transition-all duration-300">
                    <div className="flex flex-col md:flex-row md:items-center">
                      <div className={`flex items-center gap-4 p-5 md:w-72 border-r ${isDarkMode ? 'border-graphite/40 bg-stellar/20' : 'border-graphite/20 bg-stellar/30'}`}>
                        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${sc.bg} ${sc.color}`}>
                          <PlatformIcon platform={schedule.platform} size={24} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-silver truncate">{getPlatformLabel(schedule.platform)}</h4>
                          <span className={`text-[10px] font-black uppercase tracking-wider ${sc.color}`}>{schedule.status}</span>
                        </div>
                      </div>

                      <div className="flex-1 p-5 flex items-center gap-3">
                        <Clock size={16} className="text-volt shrink-0" />
                        <span className="text-sm font-bold text-silver">
                          {istDate.toLocaleString('en-IN', { 
                            weekday: 'short', 
                            month: 'short', 
                            day: 'numeric', 
                            hour: '2-digit', 
                            minute: '2-digit',
                            timeZone: 'Asia/Kolkata'
                          })} IST
                        </span>
                        {schedule.error && (
                          <Badge variant="danger" size="sm">{schedule.error}</Badge>
                        )}
                      </div>

                      <div className="p-5 flex items-center gap-3">
                        <StatusIcon size={20} className={`${sc.color} opacity-40`} />
                        {schedule.status === 'pending' && (
                          <button
                            onClick={() => cancelMutation.mutate(schedule.id)}
                            disabled={cancelMutation.isPending}
                            className={`p-2 rounded-lg transition-all ${isDarkMode ? 'text-dim hover:text-danger hover:bg-danger/10' : 'text-slate-400 hover:text-danger hover:bg-red-50'}`}
                          >
                            {cancelMutation.isPending ? <Spinner size={16} /> : <Trash2 size={16} />}
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
