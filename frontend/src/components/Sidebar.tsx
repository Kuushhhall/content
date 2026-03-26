import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Newspaper,
  PenTool,
  Calendar,
  MessageSquare,
  BarChart3,
  Zap,
} from 'lucide-react'
import { NavLink, useLocation, Link } from 'react-router-dom'
import { useUIStore } from '../store/uiStore'
import { useStatusSocket } from '../hooks/useStatusSocket'

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/news', label: 'News Feed', icon: Newspaper },
  { path: '/studio', label: 'Content Studio', icon: PenTool },
  { path: '/scheduler', label: 'Scheduler', icon: Calendar },
  { path: '/engagement', label: 'Engagement', icon: MessageSquare },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
]

export function Sidebar() {
  const { isMenuOpen, setMenuOpen, isDarkMode } = useUIStore()
  const status = useStatusSocket()
  const location = useLocation()

  return (
    <>
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMenuOpen(false)}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      <aside
        className={`fixed left-0 top-0 z-50 h-screen w-72 flex-col border-r transition-all duration-500 lg:flex ${
          isMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 ${
          isDarkMode 
            ? 'border-graphite/40 bg-void/80 backdrop-blur-2xl' 
            : 'border-graphite/20 bg-cream shadow-2xl shadow-ink/5'
        }`}
      >
      {/* Logo */}
      <Link to="/" onClick={() => setMenuOpen(false)} className="flex h-24 items-center px-8 group/logo cursor-pointer transition-opacity hover:opacity-80">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-volt shadow-glow-volt group-hover/logo:scale-110 transition-transform duration-500">
            <Zap size={22} className="text-white fill-current" />
          </div>
          <div>
            <h1 className={`font-serif text-lg font-bold leading-none ${isDarkMode ? 'text-silver' : 'text-ink'}`}>Lawxy</h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-volt">Reporter</p>
          </div>
        </div>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 space-y-1.5 px-4 py-4">
        {navItems.map((item) => {
          const active = location.pathname === item.path
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) => 
                `group relative flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-all duration-300 ${
                  isActive
                    ? 'bg-volt/10 text-volt shadow-[0_0_20px_rgba(255,222,66,0.1)]'
                    : isDarkMode 
                      ? 'text-dim hover:bg-white/5 hover:text-silver' 
                      : 'text-muted hover:bg-stellar/30 hover:text-ink'
                }`
              }
            >
              {active && (
                <motion.div
                  layoutId="active-pill"
                  className="absolute left-0 h-6 w-1 rounded-r-full bg-volt shadow-glow-volt"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <item.icon
                size={20}
                className={`transition-colors duration-300 ${
                  active ? 'text-volt' : isDarkMode ? 'group-hover:text-silver' : 'group-hover:text-slate-900'
                }`}
              />
              <span>{item.label}</span>
              {item.path === '/engagement' && status?.autoReplyEnabled && (
                <div className="ml-auto h-1.5 w-1.5 rounded-full bg-success shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Footer / Status */}
      <div className={`border-t p-6 transition-colors duration-500 ${isDarkMode ? 'border-graphite/40' : 'border-graphite/20'}`}>
        <div className={`rounded-2xl border p-4 transition-all duration-500 ${
          isDarkMode 
            ? 'border-graphite/40 bg-stellar/50' 
            : 'border-graphite/20 bg-stellar/30'
        }`}>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="h-1.5 w-1.5 rounded-full bg-success" />
                <div className="absolute inset-0 h-1.5 w-1.5 animate-ping rounded-full bg-success opacity-75" />
              </div>
              <span className={`text-[9px] font-black uppercase tracking-widest ${isDarkMode ? 'text-dim' : 'text-muted'}`}>System Sync</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className={`text-[10px] font-bold ${isDarkMode ? 'text-dim' : 'text-muted'}`}>MODELS</p>
              <p className={`font-black ${isDarkMode ? 'text-silver' : 'text-ink'}`}>{status?.articles ?? 0}</p>
            </div>
            <div>
              <p className={`text-[10px] font-bold ${isDarkMode ? 'text-dim' : 'text-muted'}`}>SYNTH</p>
              <p className={`font-black ${isDarkMode ? 'text-silver' : 'text-ink'}`}>{status?.drafts ?? 0}</p>
            </div>
          </div>
        </div>
      </div>
      </aside>
    </>
  )
}
