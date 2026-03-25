import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Calendar, Trash2, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

import { Card } from '../components/Card'
import { Badge } from '../components/Badge'
import { Spinner } from '../components/Spinner'
import { EmptyState } from '../components/EmptyState'
import { SkeletonList } from '../components/Skeleton'
import { PlatformIcon, getPlatformLabel } from '../components/PlatformIcon'
import { api } from '../lib/api'

type StatusFilter = '' | 'pending' | 'completed' | 'failed' | 'cancelled'

const statusConfig: Record<string, { variant: 'amber' | 'success' | 'danger' | 'muted' | 'info'; icon: React.ElementType }> = {
  pending: { variant: 'amber', icon: Clock },
  running: { variant: 'info', icon: AlertCircle },
  completed: { variant: 'success', icon: CheckCircle2 },
  failed: { variant: 'danger', icon: XCircle },
  cancelled: { variant: 'muted', icon: XCircle },
}

export function PostScheduler() {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<StatusFilter>('')

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

  const filtered = (schedules ?? []).filter((s) => !filter || s.status === filter)
  const counts = {
    all: schedules?.length ?? 0,
    pending: schedules?.filter((s) => s.status === 'pending').length ?? 0,
    completed: schedules?.filter((s) => s.status === 'completed').length ?? 0,
    failed: schedules?.filter((s) => s.status === 'failed').length ?? 0,
  }

  const filters: { key: StatusFilter; label: string; count: number }[] = [
    { key: '', label: 'All', count: counts.all },
    { key: 'pending', label: 'Pending', count: counts.pending },
    { key: 'completed', label: 'Completed', count: counts.completed },
    { key: 'failed', label: 'Failed', count: counts.failed },
  ]

  return (
    <div className="space-y-5">
      {/* Filter tabs */}
      <div className="flex gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
              filter === f.key
                ? 'bg-amber/15 text-amber'
                : 'text-muted hover:bg-white/5 hover:text-cream'
            }`}
          >
            {f.label}
            <span className="rounded-full bg-ink/60 px-2 py-0.5 text-xs">{f.count}</span>
          </button>
        ))}
      </div>

      {/* Schedule list */}
      {isLoading ? (
        <SkeletonList count={4} />
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={Calendar}
            title="No scheduled posts"
            description={filter ? `No ${filter} schedules found.` : 'Schedule a draft from the Content Studio to see it here.'}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((schedule) => {
            const sc = statusConfig[schedule.status] ?? statusConfig.pending
            const StatusIcon = sc.icon
            const isPast = new Date(schedule.run_at) < new Date()

            return (
              <Card key={schedule.id} padding="sm" hover>
                <div className="flex items-center gap-4">
                  {/* Platform icon */}
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-stroke/40 bg-ink/40">
                    <PlatformIcon platform={schedule.platform} size={20} />
                  </div>

                  {/* Details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-cream">
                        {getPlatformLabel(schedule.platform)}
                      </span>
                      <Badge variant={sc.variant} size="sm" dot>
                        {schedule.status}
                      </Badge>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted">
                      <Clock size={12} />
                      <span>{new Date(schedule.run_at).toLocaleString()}</span>
                      {isPast && schedule.status === 'pending' && (
                        <Badge variant="amber" size="sm">Overdue</Badge>
                      )}
                    </div>
                    {schedule.error && (
                      <p className="mt-1.5 text-xs text-danger">{schedule.error}</p>
                    )}
                  </div>

                  {/* Status icon */}
                  <StatusIcon size={18} className={`shrink-0 text-${sc.variant}`} />

                  {/* Cancel */}
                  {schedule.status === 'pending' && (
                    <button
                      onClick={() => cancelMutation.mutate(schedule.id)}
                      disabled={cancelMutation.isPending}
                      className="shrink-0 rounded-lg p-2 text-muted-dim hover:bg-danger/10 hover:text-danger transition-colors"
                      title="Cancel schedule"
                    >
                      {cancelMutation.isPending ? <Spinner size={16} /> : <Trash2 size={16} />}
                    </button>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
