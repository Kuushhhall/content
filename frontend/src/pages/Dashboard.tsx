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
      <section className={`relative overflow-hidden rounded-[2.5rem] border p-12 backdrop-blur-3xl shadow-glow-volt/5 transition-all duration-500 ${
        isDarkMode 
          ? 'border-graphite/40 bg-stellar/20' 
          : 'border-slate-200 bg-white shadow-xl'
      }`}>
        <div className={`absolute -right-32 -top-32 h-96 w-96 rounded-full blur-[120px] animate-pulse ${isDarkMode ? 'bg-volt/15' : 'bg-volt/10'}`} />
        <div className={`absolute -bottom-24 -left-24 h-72 w-72 rounded-full blur-[90px] ${isDarkMode ? 'bg-amethyst/15' : 'bg-amethyst/10'}`} />
        
        <div className="relative z-10">
          <div className="mb-10 flex flex-wrap items-center justify-between gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                 <div className="h-2 w-2 rounded-full bg-volt animate-ping" />
                 <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${isDarkMode ? 'text-volt' : 'text-teal-600'}`}>Operations Live</span>
              </div>
              <h1 className={`font-serif text-5xl font-black tracking-tighter ${isDarkMode ? 'text-silver' : 'text-slate-900'}`}>
                Mission <span className="text-volt drop-shadow-glow-volt">Control</span>
              </h1>
              <p className={`max-w-2xl text-lg font-medium leading-relaxed ${isDarkMode ? 'text-dim/80' : 'text-slate-600'}`}>
                Orchestrate your autonomous legal presence. Monitor neural ingestion, authorize content deployments, and analyze growth vectors in real-time.
              </p>
            </div>

            {/* Mode toggle */}
            <div className={`flex items-center gap-4 rounded-3xl border p-2 shadow-inner ${isDarkMode ? 'border-graphite/40 bg-void/50' : 'border-slate-100 bg-white'}`}>
              <button
                onClick={() => modeMutation.mutate('manual')}
                className={`flex items-center gap-3 rounded-2xl px-6 py-3 text-sm font-black uppercase tracking-widest transition-all duration-300 ${
                  !isAuto
                    ? 'bg-volt text-white shadow-glow-volt'
                    : isDarkMode ? 'text-dim hover:text-silver' : 'text-slate-400 hover:text-slate-900'
                }`}
              >
                <Settings2 size={18} />
                Manual
              </button>
              <button
                onClick={() => modeMutation.mutate('auto')}
                className={`flex items-center gap-3 rounded-2xl px-6 py-3 text-sm font-black uppercase tracking-widest transition-all duration-300 ${
                  isAuto
                    ? 'bg-success text-white shadow-glow-success'
                    : isDarkMode ? 'text-dim hover:text-silver' : 'text-slate-400 hover:text-slate-900'
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
              className="btn-primary group h-16 px-10 text-lg font-black shadow-glow-volt/20"
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
            
            <div className={`flex items-center gap-4 px-6 py-3 rounded-2xl border ${isDarkMode ? 'bg-void/30 border-graphite/40 text-silver/80' : 'bg-slate-50 border-slate-200 text-slate-900'}`}>
              <Radio size={16} className="text-volt animate-pulse" />
              <span className="text-sm font-bold">
                Link State: <span className={isAuto ? 'text-success' : 'text-volt'}>{isAuto ? 'Autonomous' : 'Command Sync'}</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Quick stats grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Pipeline History column */}
        <div className="lg:col-span-2 space-y-6">
          <Card padding="none" className={`overflow-hidden border transition-all ${isDarkMode ? 'border-graphite/40 bg-stellar/10' : 'border-slate-200 bg-white shadow-sm'}`}>
            <div className={`flex items-center justify-between border-b px-8 py-5 ${isDarkMode ? 'border-graphite/40 bg-void/20 text-dim' : 'border-slate-100 bg-slate-50 text-slate-500'}`}>
              <div className="flex items-center gap-3">
                 <ActivityIcon size={18} className="text-volt" />
                 <h3 className="text-xs font-black uppercase tracking-[0.2em]">Active Log Sequence</h3>
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
                      className={`group flex items-center gap-6 rounded-2xl p-4 transition-all border border-transparent ${
                        isDarkMode 
                          ? 'hover:bg-void/40 hover:border-graphite/40' 
                          : 'hover:bg-slate-50 hover:border-slate-200'
                      }`}
                    >
                      <div className={`flex h-12 w-12 items-center justify-center rounded-xl border ${
                        run.status === 'completed' ? 'border-success/30 bg-success/10 text-success' : 
                        run.status === 'failed' ? 'border-danger/30 bg-danger/10 text-danger' : 'border-volt/30 bg-volt/10 text-volt'
                      }`}>
                        {run.status === 'completed' ? <CheckCircle2 size={20} /> : 
                         run.status === 'failed' ? <XCircle size={20} /> : <Spinner size={20} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <span className={`text-sm font-black ${isDarkMode ? 'text-silver' : 'text-slate-900'}`}>CYCLE #D-{run.id.slice(-6).toUpperCase()}</span>
                          <Badge variant={run.mode === 'auto' ? 'success' : 'volt'} size="sm" className="bg-void/40">
                            {run.mode}
                          </Badge>
                        </div>
                        <div className={`flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-dim/60' : 'text-slate-400'}`}>
                           <span className="flex items-center gap-1.5"><Newspaper size={12} /> {run.articles_ingested} Ingest</span>
                           <span className="flex items-center gap-1.5"><PenTool size={12} /> {run.drafts_generated} Synth</span>
                           <span className="flex items-center gap-1.5"><Zap size={12} /> {run.posts_published} Sync</span>
                        </div>
                      </div>
                      <div className="text-right hidden sm:block">
                        <span className="text-[11px] font-black text-dim/40 block mb-1">COMPLETED</span>
                        <span className={`text-xs font-bold ${isDarkMode ? 'text-silver/60' : 'text-slate-500'}`}>
                          {run.started_at ? new Date(run.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="py-20 text-center">
                    <div className="mb-4 flex justify-center">
                        <div className={`p-4 rounded-full border ${isDarkMode ? 'bg-graphite/10 text-graphite/40 border-graphite/20' : 'bg-slate-50 text-slate-300 border-slate-100'}`}>
                            <ActivityIcon size={40} />
                        </div>
                    </div>
                    <p className="text-sm font-bold text-dim uppercase tracking-widest">No Active Telemetry</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
            {recentRuns.length > 0 && (
                <div className={`p-4 border-t text-center ${isDarkMode ? 'bg-void/20 border-graphite/40' : 'bg-slate-50 border-slate-100'}`}>
                    <button onClick={() => navigate('/analytics')} className="text-[10px] font-black uppercase tracking-[0.2em] text-volt hover:underline">
                        Access Full Historical Archives
                    </button>
                </div>
            )}
          </Card>
        </div>

        {/* Action column */}
        <div className="space-y-6">
          <Card padding="lg" className={`border transition-all ${isDarkMode ? 'border-graphite/40 bg-gradient-to-b from-stellar/40 to-void/40' : 'border-slate-200 bg-white shadow-sm'}`}>
             <div className="flex items-center gap-3 mb-8">
                <Shield size={18} className="text-amethyst" />
                <h3 className={`text-xs font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-silver' : 'text-slate-900'}`}>Quick Access Protocols</h3>
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
          <Card className={`border p-6 transition-all ${isDarkMode ? 'border-graphite/40 bg-void/40' : 'border-slate-200 bg-white shadow-sm'}`}>
              <div className="flex items-center gap-4">
                  <div className={`p-4 rounded-2xl border transition-all ${status?.autoReplyEnabled ? 'border-success/40 bg-success/10 text-success shadow-glow-success/10' : isDarkMode ? 'border-graphite/40 bg-graphite/10 text-dim' : 'border-slate-200 bg-slate-50 text-slate-300'}`}>
                      <Bot size={32} />
                  </div>
                  <div>
                      <p className={`text-sm font-black uppercase tracking-widest ${isDarkMode ? 'text-silver' : 'text-slate-900'}`}>Guardian AI</p>
                      <div className="flex items-center gap-2 mt-1">
                          <div className={`h-1.5 w-1.5 rounded-full ${status?.autoReplyEnabled ? 'bg-success animate-pulse' : 'bg-dim'}`} />
                          <span className={`text-[10px] font-bold ${status?.autoReplyEnabled ? 'text-success' : 'text-dim'}`}>
                            {status?.autoReplyEnabled ? 'ACTIVE MONITORING' : 'READY FOR UPLINK'}
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
      className={`group flex flex-col items-start gap-5 rounded-[2rem] border p-6 text-left transition-all duration-300 ${current.border} ${
        isDarkMode 
          ? 'border-graphite/40 bg-stellar/40' 
          : 'border-slate-200 bg-white shadow-sm'
      }`}
    >
      <div className={`rounded-2xl p-3 transition-transform duration-300 group-hover:scale-110 ${current.icon}`}>
        <Icon size={24} />
      </div>
      <div>
        <p className={`text-3xl font-serif font-bold tracking-tight mb-1 ${isDarkMode ? 'text-silver' : 'text-slate-900'}`}>{value}</p>
        <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${isDarkMode ? 'text-dim/60' : 'text-slate-400'}`}>{label}</p>
        <p className={`text-[10px] font-bold ${isDarkMode ? 'text-silver/40' : 'text-slate-400'}`}>{subtext}</p>
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
    volt: 'bg-volt/10 text-volt group-hover:bg-volt shadow-glow-volt/0 group-hover:shadow-glow-volt/20',
    amethyst: 'bg-amethyst/10 text-amethyst group-hover:bg-amethyst shadow-glow-amethyst/0 group-hover:shadow-glow-amethyst/20',
    success: 'bg-success/10 text-success group-hover:bg-success shadow-glow-success/0 group-hover:shadow-glow-success/20',
  }
  return (
    <button 
      onClick={onClick}
      className={`group flex w-full items-center gap-5 rounded-[1.75rem] border p-5 transition-all duration-300 hover:translate-x-1 ${
        isDarkMode 
          ? 'border-graphite/40 bg-void/30 hover:border-volt/30 hover:bg-void/50' 
          : 'border-slate-100 bg-slate-50 hover:border-volt/30 hover:bg-white hover:shadow-lg'
      }`}
    >
      <div className={`shrink-0 rounded-[1.25rem] p-4 transition-all duration-300 ${colors[color]} group-hover:text-white`}>
        <Icon size={20} />
      </div>
      <div className="text-left">
        <p className={`text-sm font-black uppercase tracking-widest mb-1 group-hover:text-teal-600 transition-colors ${isDarkMode ? 'text-silver' : 'text-slate-900'}`}>{label}</p>
        <p className={`text-xs font-medium ${isDarkMode ? 'text-dim/80' : 'text-slate-500'}`}>{desc}</p>
      </div>
      <ArrowRight size={18} className={`ml-auto opacity-0 -translate-x-4 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 ${isDarkMode ? 'text-dim/40 group-hover:text-volt' : 'text-slate-300 group-hover:text-teal-600'}`} />
    </button>
  )
}
