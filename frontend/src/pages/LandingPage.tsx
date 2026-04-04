import React from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Zap, Sparkles, ArrowRight, Activity, Bot, ChevronRight } from 'lucide-react'
import { useUIStore } from '../store/uiStore'

export function LandingPage() {
  const isDarkMode = useUIStore((state) => state.isDarkMode)

  return (
    <div className={`min-h-screen overflow-x-hidden ${isDarkMode ? 'bg-void text-silver' : 'bg-cream text-ink'}`}>
      {/* Background gradient */}
      <div className={`fixed inset-0 pointer-events-none z-0 ${isDarkMode ? 'bg-gradient-to-br from-void via-void/90 to-graphite/20' : 'bg-gradient-to-br from-cream via-cream/90 to-stellar/20'}`} />

      {/* Nav */}
      <nav className={`relative z-50 flex h-20 items-center justify-between px-6 md:px-12 border-b ${isDarkMode ? 'border-graphite/40' : 'border-graphite/20'}`}>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-volt shadow-glow-volt">
            <Zap size={18} className="text-void fill-current" />
          </div>
          <div className="flex flex-col">
            <h1 className={`text-lg font-bold leading-none ${isDarkMode ? 'text-silver' : 'text-ink'}`}>Lawxy Reporter</h1>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-volt">Legal Content OS</span>
          </div>
        </div>
        <Link
          to="/dashboard"
          className="flex items-center gap-2 px-5 py-2.5 bg-volt text-void text-sm font-bold rounded-xl hover:bg-volt/90 transition-all"
        >
          Enter Dashboard
          <ArrowRight size={14} />
        </Link>
      </nav>

      {/* Hero */}
      <main className="relative z-10 flex flex-col items-center justify-center pt-20 pb-28 text-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl"
        >
          <div className={`mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 ${isDarkMode ? 'border-graphite/40 bg-graphite/20' : 'border-graphite/20 bg-stellar/30'}`}>
            <div className="h-2 w-2 rounded-full bg-volt animate-pulse" />
            <span className={`text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-dim' : 'text-muted'}`}>Content Automation Platform</span>
          </div>

          <h1 className={`text-4xl md:text-6xl font-bold leading-tight mb-6 ${isDarkMode ? 'text-silver' : 'text-ink'}`}>
            AI-Powered Legal Content{' '}
            <span className="text-volt">Automation</span>
          </h1>

          <p className={`mx-auto max-w-2xl text-base md:text-lg mb-10 leading-relaxed ${isDarkMode ? 'text-dim' : 'text-muted'}`}>
            Transform legal news into engaging content for LinkedIn, Twitter, and Framer blogs.
            From ingestion to publishing, automate your entire content workflow.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/dashboard"
              className="flex items-center gap-2 px-8 py-3.5 bg-volt text-void text-base font-bold rounded-xl hover:bg-volt/90 transition-all shadow-glow-volt"
            >
              Get Started
              <Zap size={18} className="fill-current" />
            </Link>
            <Link
              to="/automation"
              className={`flex items-center gap-2 px-6 py-3.5 text-sm font-bold rounded-xl border transition-all ${
                isDarkMode ? 'border-graphite/40 text-dim hover:text-silver hover:bg-white/5' : 'border-graphite/20 text-muted hover:text-ink hover:bg-stellar/30'
              }`}
            >
              View Automation
              <ChevronRight size={16} />
            </Link>
          </div>
        </motion.div>

        {/* Feature Cards */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl w-full">
          <FeatureCard
            icon={Activity}
            title="News Ingestion"
            desc="Single OpenAI Responses API call fetches and ranks top 10 Indian legal news in real-time."
          />
          <FeatureCard
            icon={Sparkles}
            title="22 AI Drafts"
            desc="2 LinkedIn posts, 10 Framer articles, 10 X threads — generated in parallel from ranked news."
          />
          <FeatureCard
            icon={Bot}
            title="Automated Publishing"
            desc="Schedule and publish to LinkedIn, X, and Framer automatically on your timetable."
          />
        </div>
      </main>

      {/* Footer */}
      <div className={`border-t py-6 text-center text-sm ${isDarkMode ? 'border-graphite/40 text-dim' : 'border-graphite/20 text-muted'}`}>
        <p>Lawxy Reporter — AI-powered content automation for legal professionals</p>
      </div>
    </div>
  )
}

function FeatureCard({ icon: Icon, title, desc }: { icon: React.ElementType, title: string, desc: string }) {
  const isDarkMode = useUIStore((state) => state.isDarkMode)
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className={`p-6 text-left rounded-2xl border transition-all duration-300 ${
        isDarkMode
          ? 'border-graphite/40 bg-stellar/5 hover:border-volt/30 hover:bg-volt/5'
          : 'border-graphite/20 bg-cream shadow-lg hover:border-volt/30 hover:shadow-xl'
      }`}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-volt/10">
        <Icon size={24} className="text-volt" />
      </div>
      <h3 className={`mb-2 text-base font-bold ${isDarkMode ? 'text-silver' : 'text-ink'}`}>{title}</h3>
      <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-dim' : 'text-muted'}`}>{desc}</p>
    </motion.div>
  )
}
