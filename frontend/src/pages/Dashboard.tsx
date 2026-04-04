import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Newspaper, FileText, Clock, Sparkles, RotateCcw, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'

import { Card } from '../components/Card'
import { api } from '../lib/api'
import { useStatusSocket } from '../hooks/useStatusSocket'
import { useUIStore } from '../store/uiStore'

export function Dashboard() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const status = useStatusSocket()
  const isDarkMode = useUIStore((state) => state.isDarkMode)

  // Fetch cycle progress from persistent store
  const { data: cycleProgress, refetch: refetchCycle } = useQuery({
    queryKey: ['cycle-progress'],
    queryFn: () => api.getCycleProgress(),
    refetchInterval: 3000,
  })

  const isRunning = cycleProgress?.status === 'running'
  const isCompleted = cycleProgress?.status === 'completed'
  const isFailed = cycleProgress?.status === 'failed'

  const runCycleMut = useMutation({
    mutationFn: api.runCycle,
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['drafts'] })
      await queryClient.invalidateQueries({ queryKey: ['articles'] })
      await refetchCycle()
      const msg = `${result.total_articles} articles found, ${result.drafts_created} drafts created`
      if (result.errors && result.errors.length > 0) {
        toast.success(`${msg} (${result.errors.length} errors)`)
      } else {
        toast.success(`Cycle complete! ${msg}`)
      }
      navigate('/drafts')
    },
    onError: async (err) => {
      await refetchCycle()
      toast.error((err as Error).message)
    },
  })

  const resetCycleMut = useMutation({
    mutationFn: api.resetCycle,
    onSuccess: async () => {
      await refetchCycle()
      toast.success('Cycle reset. You can run a new cycle.')
    },
  })

  // Poll for running cycle state
  useEffect(() => {
    if (isRunning) {
      const interval = setInterval(() => {
        refetchCycle()
        queryClient.invalidateQueries({ queryKey: ['drafts'] })
        queryClient.invalidateQueries({ queryKey: ['articles'] })
      }, 3000)
      return () => clearInterval(interval)
    }
  }, [isRunning, refetchCycle, queryClient])

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Hero */}
      <section className={`relative overflow-hidden rounded-[3rem] border p-12 backdrop-blur-3xl transition-all duration-500 ${
        isDarkMode ? 'border-graphite/40 bg-stellar/10' : 'border-graphite/20 bg-cream shadow-2xl shadow-ink/5'
      }`}>
        <div className={`absolute -right-32 -top-32 h-96 w-96 rounded-full blur-[120px] animate-pulse transition-colors duration-1000 ${isDarkMode ? 'bg-volt/10' : 'bg-volt/5'}`} />
        <div className={`absolute -bottom-24 -left-24 h-72 w-72 rounded-full blur-[90px] transition-colors duration-1000 ${isDarkMode ? 'bg-amethyst/10' : 'bg-amethyst/5'}`} />
        
        <div className="relative z-10">
          <h1 className="font-serif text-5xl md:text-6xl font-black tracking-tighter text-main mb-4">
            Dashboard
          </h1>
          <p className={`max-w-2xl text-lg font-medium leading-relaxed text-muted mb-8`}>
            Run a content cycle to fetch 30 legal news articles, rank the top 10, and generate 22 drafts across LinkedIn, Framer, and X.
          </p>

          {/* Cycle status */}
          {isRunning && (
            <div className={`mb-6 rounded-2xl border p-4 ${isDarkMode ? 'border-volt/30 bg-volt/5' : 'border-volt/30 bg-volt/5'}`}>
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-volt animate-spin" />
                <div>
                  <p className="text-sm font-bold text-main">{cycleProgress?.step_detail || 'Running cycle...'}</p>
                  <p className="text-xs text-muted mt-0.5">
                    {cycleProgress?.articles_fetched || 0} articles fetched · {cycleProgress?.drafts_created || 0} drafts created
                  </p>
                </div>
              </div>
            </div>
          )}

          {isCompleted && (
            <div className={`mb-6 rounded-2xl border p-4 ${isDarkMode ? 'border-success/30 bg-success/5' : 'border-success/30 bg-success/5'}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                  <div>
                    <p className="text-sm font-bold text-main">Last cycle completed</p>
                    <p className="text-xs text-muted mt-0.5">
                      {cycleProgress?.total_articles || 0} articles · {cycleProgress?.drafts_created || 0} drafts
                    </p>
                  </div>
                </div>
                {cycleProgress?.cycle_cost_inr != null && (
                  <div className="text-right">
                    <p className="text-sm font-bold text-volt">₹{cycleProgress.cycle_cost_inr.toFixed(4)}</p>
                    <p className="text-xs text-muted">${cycleProgress.cycle_cost_usd.toFixed(6)} USD</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {isFailed && (
            <div className={`mb-6 rounded-2xl border p-4 ${isDarkMode ? 'border-danger/30 bg-danger/5' : 'border-danger/30 bg-danger/5'}`}>
              <div className="flex items-center gap-3">
                <XCircle className="w-5 h-5 text-danger" />
                <div>
                  <p className="text-sm font-bold text-main">Last cycle failed</p>
                  <p className="text-xs text-muted mt-0.5">{cycleProgress?.step_detail || 'Unknown error'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => runCycleMut.mutate()}
              disabled={isRunning}
              className="btn-primary group h-16 px-10 text-lg font-black shadow-glow-volt/20 rounded-[1.5rem] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRunning ? (
                <div className="flex items-center gap-3">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>Running...</span>
                </div>
              ) : (
                <>
                  <Sparkles size={22} className="fill-current group-hover:scale-110 transition-transform" />
                  <span className="ml-2 uppercase tracking-widest text-base">Run Content Cycle</span>
                </>
              )}
            </button>

            {(isCompleted || isFailed) && (
              <button
                onClick={() => resetCycleMut.mutate()}
                className={`flex items-center gap-2 h-16 px-6 rounded-[1.5rem] border text-sm font-bold uppercase tracking-wider transition-all ${
                  isDarkMode ? 'border-graphite/40 text-dim hover:text-silver hover:bg-white/5' : 'border-slate-200 text-slate-400 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <RotateCcw size={16} /> Reset
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <StatCard
          icon={Newspaper}
          label="Articles"
          value={status?.articles ?? 0}
          subtext="In database"
          onClick={() => navigate('/news')}
          color="volt"
        />
        <StatCard
          icon={FileText}
          label="Drafts"
          value={status?.drafts ?? 0}
          subtext="Ready to review"
          onClick={() => navigate('/drafts')}
          color="amethyst"
        />
        <StatCard
          icon={Clock}
          label="Scheduled"
          value={status?.pendingSchedules ?? 0}
          subtext="Pending posts"
          onClick={() => navigate('/scheduler')}
          color="volt"
        />
      </div>

      {/* How it works */}
      <Card>
        <h3 className={`text-sm font-black uppercase tracking-widest mb-4 ${isDarkMode ? 'text-dim' : 'text-muted'}`}>
          How It Works
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { step: '1', title: 'Search & Rank', desc: 'One OpenAI web search call fetches and ranks the top 10 Indian legal news articles by virality' },
            { step: '2', title: 'Generate 22 Drafts', desc: '2 LinkedIn posts, 10 Framer articles, 10 X threads — each from a separate LLM call' },
            { step: '3', title: 'Track Every Rupee', desc: 'Every API call is logged to costs.json with token counts and INR cost using gpt-5.4-nano pricing' },
          ].map((item) => (
            <div key={item.step} className={`rounded-2xl border p-6 ${isDarkMode ? 'border-graphite/40 bg-void/20' : 'border-graphite/20 bg-stellar/30'}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-volt text-void text-sm font-black">{item.step}</div>
                <h4 className="text-sm font-bold text-main">{item.title}</h4>
              </div>
              <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-dim' : 'text-muted'}`}>{item.desc}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function StatCard({
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
  color?: 'volt' | 'amethyst'
}) {
  const isDarkMode = useUIStore((state) => state.isDarkMode)
  const mappings = {
    volt: { icon: 'bg-volt/10 text-volt', border: 'hover:border-volt/40' },
    amethyst: { icon: 'bg-amethyst/10 text-amethyst', border: 'hover:border-amethyst/40' }
  }
  const current = mappings[color] ?? mappings.volt

  return (
    <motion.button
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`group flex flex-col items-start gap-4 rounded-[2rem] border p-8 text-left transition-all duration-300 ${current.border} ${
        isDarkMode ? 'border-graphite/40 bg-stellar/10' : 'border-graphite/20 bg-cream shadow-xl shadow-ink/5'
      }`}
    >
      <div className={`rounded-2xl p-3 transition-all duration-300 group-hover:scale-110 ${current.icon}`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-3xl font-serif font-bold tracking-tight mb-1 text-main">{value}</p>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">{label}</p>
        <p className="text-[10px] font-bold text-muted/60">{subtext}</p>
      </div>
    </motion.button>
  )
}
