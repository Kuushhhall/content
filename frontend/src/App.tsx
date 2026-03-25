import { AnimatePresence, motion } from 'framer-motion'
import { Toaster } from 'react-hot-toast'

import { Header } from './components/Header'
import { useUIStore } from './store/uiStore'
import { Dashboard } from './pages/Dashboard'
import { NewsFeed } from './pages/NewsFeed'
import { ContentStudio } from './pages/ContentStudio'
import { PostScheduler } from './pages/PostScheduler'
import { EngagementHub } from './pages/EngagementHub'
import { Analytics } from './pages/Analytics'

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
}

function App() {
  const { tab } = useUIStore()

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            background: '#141a2e',
            color: '#efe7d7',
            border: '1px solid #2a3457',
            borderRadius: '12px',
            fontSize: '13px',
            padding: '12px 16px',
          },
          success: {
            iconTheme: { primary: '#34d399', secondary: '#141a2e' },
          },
          error: {
            iconTheme: { primary: '#f87171', secondary: '#141a2e' },
          },
        }}
      />

      <main className="mx-auto min-h-screen max-w-[1400px] px-4 py-6 text-cream sm:px-6 lg:px-8">
        <Header />

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {tab === 'dashboard' && <Dashboard />}
            {tab === 'news' && <NewsFeed />}
            {tab === 'studio' && <ContentStudio />}
            {tab === 'scheduler' && <PostScheduler />}
            {tab === 'engagement' && <EngagementHub />}
            {tab === 'analytics' && <Analytics />}
          </motion.div>
        </AnimatePresence>
      </main>
    </>
  )
}

export default App
