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
  Activity as ActivityIcon,
  Shield,
  Radio,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'

import { Card } from '../components/Card'
import { Badge } from '../components/Badge'
import { Spinner } from '../components/Spinner'
import { api } from '../lib/api'
import { useStatusSocket } from '../hooks/useStatusSocket'
import { useUIStore } from '../store/uiStore'
import type { PipelineStatus } from '../types'

export function Dashboard() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const status = useStatusSocket()
  const isDarkMode = useUIStore((state) => state.isDarkMode)

  const { data: pipelineStatus } = useQuery<PipelineStatus>({
    queryKey: ['pipelineStatus'],
    queryFn: api.getPipelineStatus,
    refetchInterval: 5000,
  })

  const modeMutation = useMutation({
    mutationFn: (mode: 'auto' | 'manual') => api.setPipelineMode(mode),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['pipelineStatus'] })
      toast.success(`Protocol set to ${result.mode}`)
    },
  })

  const runPipelineMutation = useMutation({
    mutationFn: api.runPipeline,
    onSuccess: async (run) => {
      await queryClient.invalidateQueries({ queryKey: ['pipelineStatus'] })
      if (run.status === 'completed') {
        toast.success(`Neural scan complete. System synchronized.`)
      } else if (run.status === 'failed') {
        toast.error(`Neural link severed: ${run.error ?? 'Unknown interference'}`)
      }
    },
    onError: (err) => toast.error((err as Error).message),
  })

  const mode = pipelineStatus?.mode ?? status?.pipelineMode ?? 'manual'
  const isAuto = mode === 'auto'
  const currentRun = pipelineStatus?.current_run
  const recentRuns = pipelineStatus?.recent_runs ?? []

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Hero section */}
      <section className={`relative overflow-hidden rounded-[3rem] border p-12 backdrop-blur-3xl transition-all duration-500 ${
        isDarkMode 
          ? 'border-graphite/40 bg-stellar/10' 
          : 'border-slate-200 bg-white shadow-2xl shadow-slate-200/50'
      }`}>
        {/* Ambient Blobs */}
        <div className={`absolute -right-32 -top-32 h-96 w-96 rounded-full blur-[120px] animate-pulse transition-colors duration-1000 ${isDarkMode ? 'bg-volt/10' : 'bg-teal-500/5'}`} />
        <div className={`absolute -bottom-24 -left-24 h-72 w-72 rounded-full blur-[90px] transition-colors duration-1000 ${isDarkMode ? 'bg-amethyst/10' : 'bg-violet-500/5'}`} />
        
        <div className="relative z-10">
          <div className="mb-10 flex flex-wrap items-center justify-between gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                 <div className="h-2 w-2 rounded-full bg-volt animate-ping" />
                 <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${isDarkMode ? 'text-volt' : 'text-teal-600'}`}>Operations Live</span>
              </div>
              <h1 className={`font-serif text-5xl md:text-6xl font-black tracking-tighter text-main`}>
                Mission <span className="text-volt drop-shadow-glow-volt">Control</span>
              </h1>
              <p className={`max-w-2xl text-lg font-medium leading-relaxed text-muted`}>
                Orchestrate your autonomous legal presence. Monitor neural ingestion, authorize content deployments, and analyze growth vectors in real-time.
              </p>
            </div>

            {/* Mode toggle */}
            <div className={`flex items-center gap-4 rounded-[2rem] border p-2 shadow-inner transition-colors duration-500 ${isDarkMode ? 'border-graphite/40 bg-void/50' : 'border-slate-100 bg-slate-50'}`}>
              <button
                onClick={() => modeMutation.mutate('manual')}
                className={`flex items-center gap-3 rounded-[1.25rem] px-8 py-3.5 text-xs font-black uppercase tracking-widest transition-all duration-300 ${
                  !isAuto
                    ? 'bg-volt text-white shadow-glow-volt'
                    : 'text-muted hover:text-main'
                }`}
              >
                <Settings2 size={18} />
                Manual
              </button>
              <button
                onClick={() => modeMutation.mutate('auto')}
                className={`flex items-center gap-3 rounded-[1.25rem] px-8 py-3.5 text-xs font-black uppercase tracking-widest transition-all duration-300 ${
                  isAuto
                    ? 'bg-success text-white shadow-glow-success'
                    : 'text-muted hover:text-main'
                }`}
              >
                <Zap size={18} />
                Auto
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-8">
            <button
              onClick={() => runPipelineMutation.mutate()}
              disabled={runPipelineMutation.isPending || !!currentRun}
              className="btn-primary group h-16 px-12 text-lg font-black shadow-glow-volt/20 rounded-[1.5rem]"
            >
              {runPipelineMutation.isPending || currentRun ? (
                <Spinner size={32} label="Processing Sequence..." className="gap-4" />
              ) : (
                <>
                  <Play size={24} className="fill-current group-hover:scale-110 transition-transform" />
                  <span className="ml-2 uppercase tracking-widest">{isAuto ? 'Execute Protocol' : 'Manual Scan'}</span>
                  <ArrowRight size={20} className="ml-3 opacity-0 -translate-x-2 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                </>
              )}
            </button>
            
            <div className={`flex items-center gap-4 px-8 py-3.5 rounded-[1.25rem] border transition-colors duration-500 ${isDarkMode ? 'bg-void/30 border-graphite/40' : 'bg-slate-50 border-slate-100'}`}>
              <Radio size={16} className="text-volt animate-pulse" />
              <span className="text-xs font-black uppercase tracking-widest text-main">
                Link State: <span className={isAuto ? 'text-success' : 'text-volt'}>{isAuto ? 'Autonomous' : 'Command Sync'}</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Quick stats grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <QuickStatItem
          icon={Newspaper}
          label="Neural Feeds"
          value={status?.articles ?? 0}
          subtext="Source Materials"
          onClick={() => navigate('/news')}
          color="volt"
        />
        <QuickStatItem
          icon={PenTool}
          label="Synth Artifacts"
          value={status?.drafts ?? 0}
          subtext="AI Generations"
          onClick={() => navigate('/studio')}
          color="amethyst"
        />
        <QuickStatItem
          icon={Clock}
          label="Deployment Buffer"
          value={status?.pendingSchedules ?? 0}
          subtext="Verified Queues"
          onClick={() => navigate('/scheduler')}
          color="volt"
        />
        <QuickStatItem
          icon={Send}
          label="Active Nodes"
          value={status?.recentPublishes ?? 0}
          subtext="Confirmed Deploys"
          onClick={() => navigate('/analytics')}
          color="success"
        />
        <QuickStatItem
          icon={MessageCircle}
          label="Signal Matrix"
          value="Inbox"
          subtext="Feedback Loops"
          onClick={() => navigate('/engagement')}
          color="amethyst"
        />
        <QuickStatItem
          icon={Bot}
          label="Guardian Protocol"
          value={status?.autoReplyEnabled ? 'Active' : 'Standby'}
          subtext="Auto-Engagement"
          onClick={() => navigate('/engagement')}
          color={status?.autoReplyEnabled ? 'success' : 'dim'}
        />
      </div>

      <div className="grid gap-10 lg:grid-cols-3">
        {/* Pipeline History column */}
        <div className="lg:col-span-2 space-y-6">
          <Card padding="none" className="overflow-hidden">
            <div className={`flex items-center justify-between border-b px-8 py-6 ${isDarkMode ? 'border-graphite/40 bg-void/20' : 'border-slate-50 bg-slate-50/50'}`}>
              <div className="flex items-center gap-3">
                 <ActivityIcon size={18} className="text-volt" />
                 <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">Active Log Sequence</h3>
              </div>
              <Badge variant="volt" size="sm" dot>Sync Active</Badge>
            </div>
            <div className="p-4 space-y-2">
              <AnimatePresence>
                {recentRuns.length > 0 ? (
                  recentRuns.slice(0, 6).map((run) => (
                    <motion.div
                      key={run.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`group flex items-center gap-6 rounded-[2rem] p-5 transition-all border border-transparent hover:surface-stellar`}
                    >
                      <div className={`flex h-14 w-14 items-center justify-center rounded-2xl border ${
                        run.status === 'completed' ? 'border-success/30 bg-success/10 text-success' : 
                        run.status === 'failed' ? 'border-danger/30 bg-danger/10 text-danger' : 'border-volt/30 bg-volt/10 text-volt'
                      }`}>
                        {run.status === 'completed' ? <CheckCircle2 size={24} /> : 
                         run.status === 'failed' ? <XCircle size={24} /> : <Spinner size={24} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-sm font-black text-main">CYCLE #D-{run.id.slice(-6).toUpperCase()}</span>
                          <Badge variant={run.mode === 'auto' ? 'success' : 'volt'} size="sm" className={isDarkMode ? 'bg-void/40' : 'bg-white'}>
                            {run.mode}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-5 text-[10px] font-black uppercase tracking-widest text-muted">
                           <span className="flex items-center gap-2"><Newspaper size={14} className="text-volt" /> {run.articles_ingested} Ingest</span>
                           <span className="flex items-center gap-2"><PenTool size={14} className="text-amethyst" /> {run.drafts_generated} Synth</span>
                           <span className="flex items-center gap-2"><Zap size={14} className="text-success" /> {run.posts_published} Sync</span>
                        </div>
                      </div>
                      <div className="text-right hidden sm:block">
                        <span className="text-[10px] font-black text-muted/40 block mb-1 uppercase">COMPLETED</span>
                        <span className="text-xs font-black text-muted">
                          {run.started_at ? new Date(run.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="py-24 text-center">
                    <div className="mb-6 flex justify-center">
                        <div className={`p-6 rounded-full border ${isDarkMode ? 'bg-graphite/10 text-graphite/40 border-graphite/40' : 'bg-slate-50 text-slate-300 border-slate-100'}`}>
                            <ActivityIcon size={48} />
                        </div>
                    </div>
                    <p className="text-xs font-black text-muted uppercase tracking-[0.3em]">No Active Telemetry</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
            {recentRuns.length > 0 && (
                <div className={`p-5 border-t text-center ${isDarkMode ? 'bg-void/20 border-graphite/40' : 'bg-slate-50/50 border-slate-100'}`}>
                    <button onClick={() => navigate('/analytics')} className="text-[10px] font-black uppercase tracking-[0.2em] text-volt hover:underline">
                        Access Full Historical Archives
                    </button>
                </div>
            )}
          </Card>
        </div>

        {/* Action column */}
        <div className="space-y-6">
          <Card padding="lg" className="border">
             <div className="flex items-center gap-3 mb-10">
                <Shield size={18} className="text-amethyst" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">Quick Access Protocols</h3>
             </div>
            <div className="space-y-4">
              <ActionButton 
                icon={Radio} 
                label="Initialize Intercept" 
                desc="Sync with global legal feeds"
                onClick={() => navigate('/news')}
                color="volt"
              />
              <ActionButton 
                icon={Sparkles} 
                label="Synthesize Content" 
                desc="Author cross-platform briefs"
                onClick={() => navigate('/studio')}
                color="amethyst"
              />
              <ActionButton 
                icon={BarChart3} 
                label="Vector Analysis" 
                desc="Optimize growth algorithms"
                onClick={() => navigate('/analytics')}
                color="success"
              />
            </div>
          </Card>

          {/* AI Guardian Status */}
          <Card className="p-8 border bg-transparent">
              <div className="flex items-center gap-6">
                  <div className={`p-5 rounded-[1.5rem] border transition-all ${status?.autoReplyEnabled ? 'border-success/40 bg-success/10 text-success shadow-glow-success/10' : isDarkMode ? 'border-graphite/40 bg-void/50 text-dim' : 'border-slate-200 bg-slate-50 text-slate-300'}`}>
                      <Bot size={40} />
                  </div>
                  <div>
                      <p className="text-sm font-black uppercase tracking-widest text-main">Guardian AI</p>
                      <div className="flex items-center gap-2 mt-2">
                          <div className={`h-2 w-2 rounded-full ${status?.autoReplyEnabled ? 'bg-success animate-pulse' : 'bg-muted'}`} />
                          <span className={`text-[10px] font-black tracking-widest ${status?.autoReplyEnabled ? 'text-success' : 'text-muted'}`}>
                            {status?.autoReplyEnabled ? 'ACTIVE MONITORING' : 'STANDBY MODE'}
                          </span>
                      </div>
                  </div>
              </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function QuickStatItem({
  icon: Icon,
  label,
  value,
  subtext,
  onClick,
  color = 'volt'
}: {
  icon: React.ElementType
  label: string
  value: string | number
  subtext: string
  onClick?: () => void
  color?: 'volt' | 'amethyst' | 'success' | 'dim'
}) {
  const isDarkMode = useUIStore((state) => state.isDarkMode)
  const mappings = {
    volt: { icon: 'bg-volt/10 text-volt', border: 'hover:border-volt/40' },
    amethyst: { icon: 'bg-amethyst/10 text-amethyst', border: 'hover:border-amethyst/40' },
    success: { icon: 'bg-success/10 text-success', border: 'hover:border-success/40' },
    dim: { icon: 'bg-graphite/20 text-dim', border: 'hover:border-graphite/40' }
  }

  const current = mappings[color] ?? mappings.dim

  return (
    <motion.button
      whileHover={{ y: -6, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`group flex flex-col items-start gap-6 rounded-[2.5rem] border p-8 text-left transition-all duration-500 overflow-hidden ${current.border} ${
        isDarkMode 
          ? 'border-graphite/40 bg-stellar/10' 
          : 'border-slate-200 bg-white shadow-xl shadow-slate-100'
      }`}
    >
      <div className={`rounded-2xl p-4 transition-all duration-300 group-hover:scale-110 shadow-sm ${current.icon}`}>
        <Icon size={28} />
      </div>
      <div>
        <p className={`text-4xl font-serif font-bold tracking-tight mb-2 text-main`}>{value}</p>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 text-muted">{label}</p>
        <p className="text-[10px] font-bold text-muted/60">{subtext}</p>
      </div>
    </motion.button>
  )
}

function ActionButton({ 
  icon: Icon, 
  label, 
  desc, 
  onClick, 
  color 
}: { 
  icon: React.ElementType; 
  label: string; 
  desc: string; 
  onClick: () => void; 
  color: 'volt' | 'amethyst' | 'success' 
}) {
  const isDarkMode = useUIStore((state) => state.isDarkMode)
  const colors = {
    volt: 'bg-volt/10 text-volt group-hover:bg-volt group-hover:shadow-glow-volt',
    amethyst: 'bg-amethyst/10 text-amethyst group-hover:bg-amethyst group-hover:shadow-glow-amethyst',
    success: 'bg-success/10 text-success group-hover:bg-success group-hover:shadow-glow-success',
  }
  return (
    <button 
      onClick={onClick}
      className={`group flex w-full items-center gap-6 rounded-[2rem] border p-6 transition-all duration-500 hover:translate-x-1 ${
        isDarkMode 
          ? 'border-graphite/40 bg-void/30 hover:border-volt/30 hover:bg-void/50 shadow-none' 
          : 'border-slate-100 bg-slate-50 hover:border-teal-300 hover:bg-white shadow-sm hover:shadow-xl hover:shadow-slate-100'
      }`}
    >
      <div className={`shrink-0 rounded-[1.25rem] p-4 transition-all duration-500 ${colors[color]} group-hover:text-white`}>
        <Icon size={24} />
      </div>
      <div className="text-left flex-1">
        <p className="text-xs font-black uppercase tracking-widest mb-1 text-main transition-colors group-hover:text-volt">{label}</p>
        <p className="text-[11px] font-medium text-muted">{desc}</p>
      </div>
      <ArrowRight size={20} className={`ml-auto opacity-0 -translate-x-4 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 ${isDarkMode ? 'text-dim/40 group-hover:text-volt' : 'text-slate-300 group-hover:text-teal-600'}`} />
    </button>
  )
}
