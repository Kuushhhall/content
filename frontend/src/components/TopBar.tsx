import { Search, Bell, User, Menu, Zap, Settings2 } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useUIStore } from '../store/uiStore'
import { useStatusSocket } from '../hooks/useStatusSocket'
import { ThemeToggle } from './ThemeToggle'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Mission Control',
  '/news': 'Legal News Feed',
  '/studio': 'Content Studio',
  '/scheduler': 'Post Scheduler',
  '/engagement': 'Engagement Hub',
  '/analytics': 'Performance Analytics',
}

export function TopBar() {
  const { setMenuOpen, isMenuOpen, isDarkMode } = useUIStore()
  const status = useStatusSocket()
  const location = useLocation()
  const isAuto = status?.pipelineMode === 'auto'

  return (
    <header className={`sticky top-0 z-30 flex h-20 w-full items-center justify-between border-b px-8 backdrop-blur-xl shrink-0 transition-all duration-500 ${
      isDarkMode 
        ? 'border-graphite/40 bg-void/60 text-silver' 
        : 'border-slate-100 bg-white/70 text-slate-900 shadow-sm'
    }`}>
      {/* Mobile Menu Button */}
      <button 
        onClick={() => setMenuOpen(!isMenuOpen)}
        className={`lg:hidden p-2 transition-colors ${isDarkMode ? 'text-dim hover:text-silver' : 'text-slate-400 hover:text-slate-900'}`}
      >
        <Menu size={24} />
      </button>

      {/* Page Title */}
      <div className="hidden lg:block min-w-[200px]">
        <h2 className={`font-serif text-xl font-bold transition-colors ${isDarkMode ? 'text-silver' : 'text-slate-900'}`}>
          {pageTitles[location.pathname] || 'Mission Control'}
        </h2>
      </div>

      {/* Search Bar */}
      <div className="flex-1 px-8 max-w-2xl hidden md:block">
        <div className="relative group">
          <Search size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isDarkMode ? 'text-dim/60 group-focus-within:text-volt' : 'text-slate-400 group-focus-within:text-teal-600'}`} />
          <input
            type="text"
            placeholder="Neural search access..."
            className={`w-full h-11 pl-12 pr-4 transition-all outline-none rounded-2xl text-sm ${
              isDarkMode 
                ? 'bg-void/50 border-graphite/60 text-silver focus:border-volt/50 focus:ring-4 focus:ring-volt/5' 
                : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-teal-500/30 focus:bg-white focus:ring-4 focus:ring-teal-500/5'
            }`}
          />
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-4">
        {/* Mode Indicator */}
        <div className={`hidden sm:flex items-center gap-1.5 rounded-full px-4 py-2 text-[10px] font-black tracking-widest uppercase border transition-all ${
          isAuto
            ? 'border-success/40 bg-success/5 text-success shadow-[0_0_15px_rgba(16,185,129,0.15)]'
            : isDarkMode 
              ? 'border-volt/40 bg-volt/5 text-volt shadow-[0_0_15px_rgba(0,242,255,0.15)]'
              : 'border-teal-200 bg-teal-50 text-teal-700 shadow-[0_0_15px_rgba(13,148,136,0.1)]'
        }`}>
          {isAuto ? <Zap size={14} className="fill-current" /> : <Settings2 size={14} />}
          {isAuto ? 'Autonomous' : 'Manual Link'}
        </div>

        <ThemeToggle />

        <button className={`relative p-2.5 rounded-xl border transition-all ${
          isDarkMode 
            ? 'border-graphite/60 bg-stellar/50 text-dim/60 hover:text-volt hover:border-volt/30' 
            : 'border-slate-100 bg-slate-50 text-slate-400 hover:text-teal-600 hover:border-teal-200 shadow-sm'
        }`}>
          <Bell size={20} />
          <div className="absolute top-2.5 right-2.5 h-1.5 w-1.5 rounded-full bg-volt shadow-glow-volt" />
        </button>

        <div className="flex items-center gap-3 pl-2 sm:border-l sm:border-slate-100 dark:sm:border-graphite/40">
          <div className="text-right hidden sm:block">
            <p className={`text-xs font-black ${isDarkMode ? 'text-silver' : 'text-slate-900'}`}>Admin User</p>
            <p className={`text-[10px] font-bold ${isDarkMode ? 'text-dim/60' : 'text-slate-400'}`}>Lawxy-01</p>
          </div>
          <div className={`h-10 w-10 rounded-xl border p-0.5 shadow-card transition-all ${
            isDarkMode 
              ? 'border-graphite/40 bg-void/50' 
              : 'border-slate-200 bg-white'
          }`}>
            <div className={`h-full w-full rounded-[10px] flex items-center justify-center ${isDarkMode ? 'bg-volt/10' : 'bg-teal-50'}`}>
              <User size={20} className={isDarkMode ? 'text-volt' : 'text-teal-600'} />
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
