import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Zap, Sparkles, ArrowRight, Activity, Bot, ChevronRight } from 'lucide-react'

export function LandingPage() {
  return (
    <div className="min-h-screen bg-void text-silver selection:bg-volt selection:text-void overflow-x-hidden">
      {/* Dynamic Background Aura */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -left-1/4 -top-1/4 h-[800px] w-[800px] animate-blob rounded-full bg-volt/10 blur-[150px] opacity-40" />
        <div className="absolute -bottom-1/4 -right-1/4 h-[1000px] w-[1000px] animate-blob rounded-full bg-amethyst/10 blur-[200px] opacity-30 animation-delay-2000" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] animate-blob rounded-full bg-success/5 blur-[180px] opacity-20 animation-delay-4000" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay" />
      </div>

      {/* Primary Navigation */}
      <nav className="relative z-50 flex h-24 items-center justify-between px-8 md:px-16">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-volt shadow-glow-volt">
             <Zap size={22} className="text-void" />
          </div>
          <div className="flex flex-col">
            <h1 className="font-serif text-xl font-bold leading-none tracking-tight text-cream">Lawxy Reporter</h1>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-volt">Legal Content OS</span>
          </div>
        </div>
        <Link 
          to="/dashboard" 
          className="group flex items-center gap-3 rounded-2xl border border-volt/30 bg-volt/5 px-6 py-3 text-xs font-black uppercase tracking-widest text-volt transition-all hover:bg-volt hover:text-void hover:shadow-glow-volt"
        >
          Mission Control
          <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
        </Link>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center pt-24 pb-32 text-center">
        <motion.div
           initial={{ opacity: 0, y: 30 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
           className="max-w-4xl px-8"
        >
          <div className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-volt/20 bg-volt/5 px-5 py-2">
             <div className="h-1.5 w-1.5 rounded-full bg-volt animate-ping" />
             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-volt/90">Autonomous Content Protocol v2.5</span>
          </div>

          <h1 className="font-serif text-6xl md:text-8xl font-black leading-[1.1] tracking-tighter text-cream mb-8 drop-shadow-2xl">
            The Future of <span className="text-volt drop-shadow-glow-volt">Legal Authority</span>
          </h1>

          <p className="mx-auto max-w-2xl text-lg md:text-xl font-medium leading-relaxed text-dim/80 mb-12">
            Amplify your reach with high-IQ, AI-synthesized legal narratives. From news ingestion to multi-platform deployment, Lawxy Reporter automates your entire reputation cycle.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
             <Link 
                to="/dashboard" 
                className="group w-full sm:w-auto flex items-center justify-center gap-4 rounded-[2rem] bg-volt px-10 py-6 text-lg font-black uppercase tracking-widest text-void shadow-glow-volt transition-all hover:scale-105 active:scale-95"
             >
                Enter System
                <Zap size={22} className="fill-current group-hover:animate-pulse" />
             </Link>
             <button
               className="group w-full sm:w-auto flex items-center justify-center gap-3 rounded-[2rem] border border-graphite/40 bg-void/40 px-8 py-6 text-xs font-black uppercase tracking-widest text-silver backdrop-blur-xl transition-all hover:border-volt/30 hover:bg-void/60"
             >
                Examine Protocols
                <ChevronRight size={18} className="translate-x-0 transition-transform group-hover:translate-x-1" />
             </button>
          </div>
        </motion.div>

        {/* Floating Metrics Tease */}
        <div className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-8 px-8 max-w-6xl w-full">
           <FeatureCard 
             icon={Activity} 
             title="Neural Ingestion" 
             desc="Real-time monitoring of global legal feeds and legislative tremors."
             color="volt"
           />
           <FeatureCard 
             icon={Sparkles} 
             title="Content Synthesis" 
             desc="Engineered platform-native drafts optimized for legal elite readers."
             color="amethyst"
           />
           <FeatureCard 
             icon={Bot} 
             title="Autonomous Loop" 
             desc="Smart scheduling and AI-driven engagement handlers."
             color="success"
           />
        </div>
      </main>

      {/* Bottom Glow */}
      <div className="fixed bottom-0 left-0 right-0 h-1 border-t border-volt/20 bg-volt/5 pointer-events-none" />
    </div>
  )
}

function FeatureCard({ icon: Icon, title, desc, color }: { icon: any, title: string, desc: string, color: 'volt' | 'amethyst' | 'success' }) {
  const colors = {
    volt: 'border-volt/20 bg-volt/5 text-volt shadow-glow-volt/5',
    amethyst: 'border-amethyst/20 bg-amethyst/5 text-amethyst shadow-glow-amethyst/5',
    success: 'border-success/20 bg-success/5 text-success shadow-glow-success/5'
  }

  return (
    <motion.div 
      whileHover={{ y: -8, scale: 1.02 }}
      className={`rounded-3xl border p-8 text-left backdrop-blur-md transition-all duration-300 ${colors[color]}`}
    >
       <div className={`mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-void/50 border border-current transition-transform duration-500`}>
         <Icon size={28} />
       </div>
       <h3 className="mb-3 text-lg font-black uppercase tracking-widest text-silver">{title}</h3>
       <p className="text-sm font-medium leading-relaxed text-dim/70 italic">{desc}</p>
    </motion.div>
  )
}
