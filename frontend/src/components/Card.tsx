import type { PropsWithChildren } from 'react'
import { motion } from 'framer-motion'
import { useUIStore } from '../store/uiStore'

interface CardProps {
  className?: string
  hover?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
  onClick?: () => void
}

const paddings = { none: 'p-0', sm: 'p-4', md: 'p-8', lg: 'p-12' }

export function Card({ children, className = '', hover = false, padding = 'md', onClick }: PropsWithChildren<CardProps>) {
  const isDarkMode = useUIStore(state => state.isDarkMode);

  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.19, 1, 0.22, 1] }}
      onClick={onClick}
      className={`rounded-[2.5rem] border transition-all duration-500 ${paddings[padding]} ${
        isDarkMode 
          ? 'border-graphite/40 bg-stellar/20 shadow-none' 
          : 'border-slate-200 bg-white shadow-xl shadow-slate-100/50 text-slate-900'
      } ${
        hover ? 'hover:scale-[1.01] hover:shadow-2xl' : ''
      } ${className}`}
    >
      {children}
    </motion.section>
  )
}
