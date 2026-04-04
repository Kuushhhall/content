import type { PropsWithChildren } from 'react'
import { motion } from 'framer-motion'
import { useUIStore } from '../store/uiStore'

interface CardProps {
  className?: string
  hover?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
  onClick?: () => void
}

const paddings = { none: 'p-0', sm: 'p-3', md: 'p-4', lg: 'p-6' }

export function Card({
  children,
  className = '',
  hover = false,
  padding = 'md',
  onClick,
}: PropsWithChildren<CardProps>) {
  const isDarkMode = useUIStore((s) => s.isDarkMode)

  const base = isDarkMode
    ? 'border-graphite/40 bg-graphite/10'
    : 'border-graphite/20 bg-white shadow-sm'

  const hoverClass = hover
    ? 'hover:border-volt/30 hover:bg-volt/5 cursor-pointer transition-all duration-300'
    : ''

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className={`rounded-2xl border ${base} ${paddings[padding]} ${hoverClass} ${className}`}
    >
      {children}
    </motion.div>
  )
}
