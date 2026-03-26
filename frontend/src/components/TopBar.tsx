import { Menu } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useUIStore } from '../store/uiStore'
import { ThemeToggle } from './ThemeToggle'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/news': 'News Feed',
  '/studio': 'Content Studio',
  '/scheduler': 'Post Scheduler',
  '/engagement': 'Engagement Hub',
  '/analytics': 'Analytics',
}

export function TopBar() {
  const { setMenuOpen, isMenuOpen, isDarkMode } = useUIStore()
  const location = useLocation()

  return (
    <header className={`sticky top-0 z-30 flex h-20 w-full items-center justify-between border-b px-8 backdrop-blur-xl shrink-0 transition-all duration-500 ${
      isDarkMode 
        ? 'border-graphite/40 bg-void/60 text-silver' 
        : 'border-graphite/20 bg-cream/70 text-ink shadow-sm'
    }`}>
      {/* Mobile Menu Button */}
      <button 
        onClick={() => setMenuOpen(!isMenuOpen)}
        className={`lg:hidden p-2 transition-colors ${isDarkMode ? 'text-dim hover:text-silver' : 'text-muted hover:text-ink'}`}
      >
        <Menu size={24} />
      </button>

      {/* Page Title */}
      <div className="hidden lg:block min-w-[200px]">
        <h2 className={`font-serif text-xl font-bold transition-colors ${isDarkMode ? 'text-silver' : 'text-ink'}`}>
          {pageTitles[location.pathname] || 'Dashboard'}
        </h2>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-4">
        <ThemeToggle />
      </div>
    </header>
  )
}
