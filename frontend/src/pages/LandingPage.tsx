import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Zap, Sparkles, ArrowRight, Activity, Bot, ChevronRight } from 'lucide-react'

export function LandingPage() {
  return (
    <div className="min-h-screen bg-bg-primary text-text-primary overflow-x-hidden">
      {/* Simple background gradient */}
      <div className="fixed inset-0 pointer-events-none z-0 bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-tertiary opacity-80" />

      {/* Primary Navigation */}
      <nav className="relative z-50 flex h-20 items-center justify-between px-6 md:px-12 border-b border-border-primary">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-primary">
             <Zap size={18} className="text-white" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg font-semibold leading-none text-text-primary">Lawxy Reporter</h1>
            <span className="text-[10px] font-medium uppercase tracking-wider text-text-secondary">Legal Content OS</span>
          </div>
        </div>
        <Link
          to="/dashboard"
          className="btn btn-primary flex items-center gap-2 text-sm"
        >
          Enter Dashboard
          <ArrowRight size={14} />
        </Link>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center pt-16 pb-24 text-center px-4">
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.5 }}
           className="max-w-3xl"
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border-primary bg-bg-secondary px-4 py-1.5">
             <div className="h-2 w-2 rounded-full bg-accent-primary" />
             <span className="text-xs font-medium uppercase tracking-wider text-text-secondary">Content Automation Platform</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold leading-tight text-text-primary mb-6">
            AI-Powered Legal Content <span className="text-accent-primary">Automation</span>
          </h1>

          <p className="mx-auto max-w-2xl text-base md:text-lg text-text-secondary mb-8 leading-relaxed">
            Transform legal news into engaging content for LinkedIn, Twitter, and blogs.
            From ingestion to publishing, automate your entire content workflow.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
             <Link
                to="/dashboard"
                className="btn btn-primary px-8 py-3 text-base font-medium"
             >
                Get Started
                <Zap size={18} className="ml-2" />
             </Link>
             <button
               className="btn btn-secondary px-6 py-3 text-sm"
             >
                Learn More
                <ChevronRight size={16} className="ml-2" />
             </button>
          </div>
        </motion.div>

        {/* Feature Cards */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full">
           <FeatureCard
             icon={Activity}
             title="News Ingestion"
             desc="Monitor legal RSS feeds and web sources in real-time."
           />
           <FeatureCard
             icon={Sparkles}
             title="AI Content Generation"
             desc="Create platform-optimized drafts using advanced LLMs."
           />
           <FeatureCard
             icon={Bot}
             title="Automated Publishing"
             desc="Schedule and publish to multiple platforms automatically."
           />
        </div>
      </main>

      {/* Footer */}
      <div className="border-t border-border-primary py-6 text-center text-sm text-text-tertiary">
        <p>Legal Content OS • AI-powered content automation for legal professionals</p>
      </div>
    </div>
  )
}

function FeatureCard({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="card-hover p-6 text-left"
    >
       <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent-primary/10">
         <Icon size={24} className="text-accent-primary" />
       </div>
       <h3 className="mb-2 text-lg font-semibold text-text-primary">{title}</h3>
       <p className="text-sm text-text-secondary leading-relaxed">{desc}</p>
    </motion.div>
  )
}
