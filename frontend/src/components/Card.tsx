import type { PropsWithChildren } from 'react'
import { motion } from 'framer-motion'

interface CardProps {
  className?: string
  hover?: boolean
  padding?: 'sm' | 'md' | 'lg'
  onClick?: () => void
}

const paddings = { sm: 'p-3', md: 'p-5', lg: 'p-6' }

export function Card({ children, className = '', hover = false, padding = 'md', onClick }: PropsWithChildren<CardProps>) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      onClick={onClick}
      className={`rounded-2xl border border-stroke/50 bg-panel/80 shadow-card backdrop-blur-md ${paddings[padding]} ${
        hover ? 'transition-all duration-200 hover:border-stroke-light hover:shadow-card-hover' : ''
      } ${className}`}
    >
      {children}
    </motion.section>
  )
}
