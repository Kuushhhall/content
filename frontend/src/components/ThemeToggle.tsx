import { Sun, Moon } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUIStore } from '../store/uiStore'

export function ThemeToggle() {
  const { isDarkMode, toggleDarkMode } = useUIStore()

  return (
    <button
      onClick={() => {
        console.log('[ThemeToggle] Switching from:', isDarkMode ? 'Dark' : 'Light');
        toggleDarkMode();
      }}
      className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-graphite/40 bg-stellar/50 text-dim transition-all hover:border-volt/30 hover:text-volt active:scale-90 dark:hover:border-volt/30 dark:hover:text-volt light:hover:border-volt/30 light:hover:text-volt"
      title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isDarkMode ? (
          <motion.div
            key="moon"
            initial={{ y: 20, opacity: 0, rotate: 45 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            exit={{ y: -20, opacity: 0, rotate: -45 }}
            transition={{ duration: 0.3, ease: 'backOut' }}
          >
            <Moon size={18} />
          </motion.div>
        ) : (
          <motion.div
            key="sun"
            initial={{ y: 20, opacity: 0, rotate: -45 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            exit={{ y: -20, opacity: 0, rotate: 45 }}
            transition={{ duration: 0.3, ease: 'backOut' }}
          >
            <Sun size={18} />
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  )
}
