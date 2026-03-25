import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Play,
  Zap,
  Settings2,
  Newspaper,
  PenTool,
  Send,
  MessageCircle,
  BarChart3,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Sparkles,
  Bot,
} from 'lucide-react'
import toast from 'react-hot-toast'

import { Card } from '../components/Card'
import { Badge } from '../components/Badge'
import { Spinner } from '../components/Spinner'
import { api } from '../lib/api'
import { useStatusSocket } from '../hooks/useStatusSocket'
import { useUIStore } from '../store/uiStore'
import type { PipelineStatus } from '../types'

export function Dashboard() {
  const queryClient = useQueryClient()
  const status = useStatusSocket()
  const { setTab } = useUIStore()

  const { data: pipelineStatus } = useQuery<PipelineStatus>({
    queryKey: ['pipelineStatus'],
    queryFn: api.getPipelineStatus,
    refetchInterval: 3000,
  })

  const modeMutation = useMutation({
    mutationFn: (mode: 'auto' | 'manual') => api.setPipelineMode(mode),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['pipelineStatus'] })
      toast.success(`Switched to ${result.mode} mode`)
    },
  })

  const runPipelineMutation = useMutation({
    mutationFn: api.runPipeline,
    onSuccess: async (run) => {
      await queryClient.invalidateQueries({ queryKey: ['pipelineStatus'] })
      await queryClient.invalidateQueries({ queryKey: ['articles'] })
      await queryClient.invalidateQueries({ queryKey: ['drafts'] })
      await queryClient.invalidateQueries({ queryKey: ['analytics'] })
      if (run.status === 'completed') {
        toast.success(
          `Pipeline complete! ${run.articles_ingested} articles, ${run.drafts_generated} drafts, ${run.posts_published} published`,
        )
      } else {
        toast.error(`Pipeline failed: ${run.error ?? 'Unknown error'}`)
      }
    },
    onError: (err) => toast.error((err as Error).message),
  })

  const mode = pipelineStatus?.mode ?? status?.pipelineMode ?? 'manual'
  const isAuto = mode === 'auto'
  const currentRun = pipelineStatus?.current_run
  const recentRuns = pipelineStatus?.recent_runs ?? []

  return (
    <div className="space-y-6">
      {/* Hero section */}
      <div className="relative overflow-hidden rounded-3xl border border-stroke/30 bg-gradient-to-br from-panel via-panel to-ink/80 p-8">
        <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-amber/5 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-info/5 blur-3xl" />
        <div className="relative">
          <h1 className="mb-2 font-serif text-3xl font-bold text-cream">Welcome to Lawxy Reporter</h1>
          <p className="mb-6 max-w-xl text-sm leading-relaxed text-muted">
            Your AI-powered legal content pipeline. Discover news, generate platform-native
            content, publish across channels, and engage with your audience — automatically.
          </p>

          {/* Mode toggle */}
          <div className="mb-6 flex items-center gap-4">
            <span className="text-sm font-medium text-muted-dim">Pipeline Mode:</span>
            <div className="flex rounded-xl border border-stroke/40 bg-ink/50 p-1">
              <button
                onClick={() => modeMutation.mutate('manual')}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  !isAuto
                    ? 'bg-amber/15 text-amber shadow-sm'
                    : 'text-muted hover:text-cream'
                }`}
              >
                <Settings2 size={15} />
                Manual
              </button>
              <button
                onClick={() => modeMutation.mutate('auto')}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  isAuto
                    ? 'bg-success/15 text-success shadow-sm'
                    : 'text-muted hover:text-cream'
                }`}
              >
                <Zap size={15} />
                Auto
              </button>
            </div>
            <Badge variant={isAuto ? 'success' : 'amber'} size="md" dot>
              {isAuto ? 'Full automation' : 'Controlled workflow'}
            </Badge>
          </div>

          {/* Run pipeline button */}
          <button
            onClick={() => runPipelineMutation.mutate()}
            disabled={runPipelineMutation.isPending || !!currentRun}
            className="btn-primary text-base px-6 py-3"
          >
            {runPipelineMutation.isPending || currentRun ? (
              <Spinner size={18} label="Pipeline running..." />
            ) : (
              <>
                <Play size={18} />
                {isAuto ? 'Run Full Auto Pipeline' : 'Run Pipeline (Manual Review)'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <QuickStat
          icon={Newspaper}
          label="Articles"
          value={status?.articles ?? 0}
          onClick={() => setTab('news')}
        />
        <QuickStat
          icon={PenTool}
          label="Drafts"
          value={status?.drafts ?? 0}
          onClick={() => setTab('studio')}
        />
        <QuickStat
          icon={Clock}
          label="Scheduled"
          value={status?.pendingSchedules ?? 0}
          onClick={() => setTab('scheduler')}
        />
        <QuickStat
          icon={Send}
          label="Published"
          value={status?.recentPublishes ?? 0}
          onClick={() => setTab('analytics')}
        />
        <QuickStat
          icon={MessageCircle}
          label="Engagement"
          value="View"
          onClick={() => setTab('engagement')}
        />
        <QuickStat
          icon={Bot}
          label="Auto-Reply"
          value={status?.autoReplyEnabled ? 'ON' : 'OFF'}
          highlight={status?.autoReplyEnabled}
          onClick={() => setTab('engagement')}
        />
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card hover className="cursor-pointer" onClick={() => setTab('news')}>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-info/10 p-3">
              <Newspaper size={20} className="text-info" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-cream">Discover News</h3>
              <p className="text-xs text-muted">Browse & ingest legal articles</p>
            </div>
            <ArrowRight size={16} className="text-muted-dim" />
          </div>
        </Card>
        <Card hover className="cursor-pointer" onClick={() => setTab('studio')}>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber/10 p-3">
              <Sparkles size={20} className="text-amber" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-cream">Generate Content</h3>
              <p className="text-xs text-muted">AI drafts for any platform</p>
            </div>
            <ArrowRight size={16} className="text-muted-dim" />
          </div>
        </Card>
        <Card hover className="cursor-pointer" onClick={() => setTab('analytics')}>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-success/10 p-3">
              <BarChart3 size={20} className="text-success" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-cream">View Analytics</h3>
              <p className="text-xs text-muted">Performance & metrics</p>
            </div>
            <ArrowRight size={16} className="text-muted-dim" />
          </div>
        </Card>
      </div>

      {/* Pipeline run history */}
      {recentRuns.length > 0 && (
        <Card>
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-dim">
            Pipeline Run History
          </h3>
          <div className="space-y-2">
            {recentRuns.slice(0, 5).map((run) => (
              <div
                key={run.id}
                className="flex items-center gap-4 rounded-xl border border-stroke/30 bg-ink/30 p-3"
              >
                {run.status === 'completed' ? (
                  <CheckCircle2 size={18} className="text-success shrink-0" />
                ) : run.status === 'failed' ? (
                  <XCircle size={18} className="text-danger shrink-0" />
                ) : (
                  <Spinner size={18} />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={run.mode === 'auto' ? 'success' : 'amber'} size="sm">
                      {run.mode}
                    </Badge>
                    <Badge
                      variant={
                        run.status === 'completed' ? 'success' : run.status === 'failed' ? 'danger' : 'info'
                      }
                      size="sm"
                      dot
                    >
                      {run.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {run.articles_ingested} ingested, {run.drafts_generated} drafted, {run.posts_published} published
                  </p>
                </div>
                <div className="text-right text-xs text-muted-dim">
                  {run.started_at ? new Date(run.started_at).toLocaleTimeString() : ''}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Pipeline flow visualization */}
      <Card>
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-dim">
          How It Works
        </h3>
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
          {[
            { icon: Newspaper, label: 'Discover', color: 'text-info' },
            { icon: Sparkles, label: 'Generate', color: 'text-amber' },
            { icon: Send, label: 'Publish', color: 'text-success' },
            { icon: MessageCircle, label: 'Engage', color: 'text-purple-400' },
            { icon: BarChart3, label: 'Analyze', color: 'text-cream' },
          ].map((step, i) => (
            <div key={step.label} className="flex items-center gap-2">
              {i > 0 && <ArrowRight size={12} className="text-stroke" />}
              <div className="flex items-center gap-1.5 rounded-lg border border-stroke/30 bg-ink/40 px-3 py-2">
                <step.icon size={14} className={step.color} />
                <span className="font-medium text-cream">{step.label}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-center text-xs text-muted-dim">
          {isAuto
            ? 'Auto mode: All steps run automatically. Content is published without manual review.'
            : 'Manual mode: Articles are selected and content is reviewed before publishing.'}
        </p>
      </Card>
    </div>
  )
}

function QuickStat({
  icon: Icon,
  label,
  value,
  onClick,
  highlight,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  onClick?: () => void
  highlight?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-3 rounded-xl border border-stroke/30 bg-panel/50 p-3 text-left transition-all hover:border-stroke-light hover:bg-panel-hover/60"
    >
      <Icon size={18} className={highlight ? 'text-success' : 'text-muted-dim group-hover:text-amber'} />
      <div>
        <p className="text-lg font-bold text-cream">{value}</p>
        <p className="text-[11px] text-muted-dim">{label}</p>
      </div>
    </button>
  )
}
