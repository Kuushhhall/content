import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { Routes, Route, useLocation } from 'react-router-dom'
import { Sidebar } from './components/Sidebar'
import { TopBar } from './components/TopBar'
import { LandingPage } from './pages/LandingPage'
import { Dashboard } from './pages/Dashboard'
import { NewsFeed } from './pages/NewsFeed'
import { DraftsPage } from './pages/DraftsPage'
import { PostScheduler } from './pages/PostScheduler'
import CostTracker from './pages/CostTracker'
import { AutomationDashboard } from './pages/AutomationDashboard'
import { useUIStore } from './store/uiStore'

const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
}

function App() {
  const location = useLocation()
  const isDarkMode = useUIStore(state => state.isDarkMode)
  const isSidebarCollapsed = useUIStore(state => state.isSidebarCollapsed)
  const isLanding = location.pathname === '/'

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.remove('light')
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
      document.documentElement.classList.add('light')
    }
  }, [isDarkMode])

  return (
    <div className={`flex h-screen w-full overflow-hidden ${isDarkMode ? 'bg-void text-silver' : 'bg-cream text-ink'}`}>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            background: isDarkMode ? '#141418' : '#ffffff',
            color: isDarkMode ? '#F5F5F7' : '#17171E',
            border: isDarkMode ? '1px solid rgba(42,42,48,0.6)' : '1px solid rgba(42,42,48,0.2)',
            borderRadius: '0.75rem',
            fontSize: '13px',
            fontWeight: '500',
            padding: '12px 16px',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          },
        }}
      />

      {!isLanding && <Sidebar />}

      <main className={`flex flex-1 flex-col overflow-hidden ${!isLanding ? (isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-72') : ''}`}>
        {!isLanding && <TopBar />}

        <div className={`relative z-10 flex-1 overflow-y-auto overflow-x-hidden ${!isLanding ? 'p-8 md:p-12' : ''} scrollbar-thin`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.2 }}
              className={!isLanding ? "w-full max-w-full" : "h-full w-full"}
            >
              <Routes location={location}>
                <Route path="/" element={<LandingPage />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/news" element={<NewsFeed />} />
                <Route path="/drafts" element={<DraftsPage />} />
                <Route path="/automation" element={<AutomationDashboard />} />
                <Route path="/scheduler" element={<PostScheduler />} />
                <Route path="/costs" element={<CostTracker />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}

export default App
