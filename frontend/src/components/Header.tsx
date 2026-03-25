import { Activity, Home, Newspaper, PenTool, Calendar, MessageCircle, BarChart3, Zap, Settings2 } from 'lucide-react'
import { NavLink, useLocation, Link } from 'react-router-dom'
import { useStatusSocket } from '../hooks/useStatusSocket'
import { Badge } from './Badge'

const tabs = [
  { path: '/dashboard', label: 'Dashboard', icon: Home },
  { path: '/news', label: 'News Feed', icon: Newspaper },
  { path: '/studio', label: 'Studio', icon: PenTool },
  { path: '/scheduler', label: 'Scheduler', icon: Calendar },
  { path: '/engagement', label: 'Engagement', icon: MessageCircle },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
]

export function Header() {
  const status = useStatusSocket()
  const location = useLocation()
  const isAuto = status?.pipelineMode === 'auto'

  return (
    <header className="mb-8">
      {/* Top bar */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/" className="mb-3 flex items-center gap-3 group/header cursor-pointer transition-opacity hover:opacity-80">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber to-amber-light shadow-glow-amber group-hover/header:scale-110 transition-transform duration-500">
              <PenTool size={20} className="text-ink" />
            </div>
            <div>
              <h1 className="font-serif text-xl font-bold text-cream">Content Creation Engine</h1>
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-dim">Legal Content OS</p>
            </div>
          </Link>
          <p className="max-w-2xl text-sm leading-relaxed text-muted">
            Discover legal news, craft platform-native drafts, schedule or publish instantly, and track engagement.
          </p>
        </div>

        {/* Live status */}
        <div className="flex items-center gap-3">
          {/* Mode indicator */}
          <div className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium ${isAuto
              ? 'border-success/40 bg-success/5 text-success'
              : 'border-amber/40 bg-amber/5 text-amber'
            }`}>
            {isAuto ? <Zap size={13} /> : <Settings2 size={13} />}
            {isAuto ? 'Auto' : 'Manual'}
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-stroke/50 bg-panel/60 px-4 py-3 backdrop-blur-sm">
            <Activity size={14} className={status ? 'text-success animate-pulse-slow' : 'text-muted-dim'} />
            <div className="flex items-center gap-3 text-xs text-muted">
              <span>{status?.articles ?? 0} articles</span>
              <span className="text-stroke">|</span>
              <span>{status?.drafts ?? 0} drafts</span>
              <span className="text-stroke">|</span>
              <span>{status?.pendingSchedules ?? 0} queued</span>
              <span className="text-stroke">|</span>
              <Badge variant={status?.autoReplyEnabled ? 'success' : 'muted'} size="sm" dot>
                Auto-reply
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <nav className="flex gap-1 rounded-2xl border border-stroke/30 bg-ink/40 p-1.5 backdrop-blur-sm">
        {tabs.map((item) => {
          const active = location.pathname === item.path
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => 
                `relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 ${isActive
                    ? 'bg-amber/15 text-amber shadow-sm'
                    : 'text-muted hover:bg-white/5 hover:text-cream'
                }`
              }
            >
              <item.icon size={16} />
              <span className="hidden sm:inline">{item.label}</span>
              {active && (
                <span className="absolute bottom-0 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-amber" />
              )}
            </NavLink>
          )
        })}
      </nav>
    </header>
  )
}
