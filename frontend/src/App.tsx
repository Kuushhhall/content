import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { Routes, Route, useLocation } from 'react-router-dom'
import { Sidebar } from './components/Sidebar'
import { TopBar } from './components/TopBar'
import { LandingPage } from './pages/LandingPage'
import { Dashboard } from './pages/Dashboard'
import { NewsFeed } from './pages/NewsFeed'
import { ContentStudio } from './pages/ContentStudio'
import { PostScheduler } from './pages/PostScheduler'
import { EngagementHub } from './pages/EngagementHub'
import { Analytics } from './pages/Analytics'
import { useUIStore } from './store/uiStore'

const pageVariants = {
  initial: { opacity: 0, scale: 0.98, filter: 'blur(10px)' },
  animate: { opacity: 1, scale: 1, filter: 'blur(0px)' },
  exit: { opacity: 0, scale: 1.02, filter: 'blur(20px)' },
}

function App() {
  const location = useLocation()
  const isDarkMode = useUIStore(state => state.isDarkMode)
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
    <div className={`flex h-screen w-full selection:bg-volt selection:text-void overflow-hidden transition-colors duration-700 ${isDarkMode ? 'bg-void' : 'bg-white'}`}>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          className: 'premium-toast',
          style: {
            background: isDarkMode ? 'rgba(10, 11, 14, 0.9)' : 'rgba(255, 255, 255, 0.95)',
            color: isDarkMode ? '#EDF2F4' : '#0f172a',
            border: isDarkMode ? '1px solid rgba(0, 242, 255, 0.2)' : '1px solid rgba(13, 148, 136, 0.2)',
            borderRadius: '24px',
            fontSize: '13px',
            fontWeight: '700',
            padding: '16px 24px',
            backdropFilter: 'blur(20px)',
            boxShadow: isDarkMode ? '0 12px 64px rgba(0,0,0,0.6)' : '0 12px 64px rgba(15, 23, 42, 0.1)',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          },
        }}
      />

      {/* Conditionally render Side & Top bars */}
      {!isLanding && <Sidebar />}

      <main className={`relative flex flex-1 flex-col overflow-hidden ${!isLanding ? 'lg:pl-72' : ''}`}>
        {/* Background Aura Decorations */}
        <div className="pointer-events-none absolute -left-40 -top-40 z-0 h-[800px] w-[800px] animate-blob rounded-full bg-volt/10 blur-[160px] opacity-40 transition-colors duration-500" />
        <div className="pointer-events-none absolute -bottom-60 -right-60 z-0 h-[1000px] w-[1000px] animate-blob rounded-full bg-amethyst/10 blur-[200px] opacity-30 animation-delay-2000 transition-colors duration-500" />
        <div className="pointer-events-none absolute left-1/4 top-1/2 z-0 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 animate-blob rounded-full bg-success/10 blur-[140px] opacity-20 animation-delay-4000 transition-colors duration-500" />

        {!isLanding && <TopBar />}

        <div className={`relative z-10 flex-1 overflow-y-auto overflow-x-hidden ${!isLanding ? 'p-8 md:p-12' : ''} scrollbar-thin`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className={!isLanding ? "mx-auto max-w-[1400px]" : "h-full w-full"}
            >
              <Routes location={location}>
                <Route path="/" element={<LandingPage />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/news" element={<NewsFeed />} />
                <Route path="/studio" element={<ContentStudio />} />
                <Route path="/scheduler" element={<PostScheduler />} />
                <Route path="/engagement" element={<EngagementHub />} />
                <Route path="/analytics" element={<Analytics />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}

export default App
