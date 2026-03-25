import type { PropsWithChildren } from 'react'
import { motion } from 'framer-motion'

interface CardProps {
  className?: string
  hover?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
  onClick?: () => void
}

const paddings = { none: 'p-0', sm: 'p-3', md: 'p-5', lg: 'p-6' }

export function Card({ children, className = '', hover = false, padding = 'md', onClick }: PropsWithChildren<CardProps>) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      onClick={onClick}
      className={`rounded-3xl border border-graphite/40 bg-stellar/40 shadow-card backdrop-blur-xl ${paddings[padding]} ${
        hover ? 'transition-all duration-300 hover:border-volt/30 hover:bg-stellar/60 hover:shadow-card-hover' : ''
      } ${className}`}
    >
      {children}
    </motion.section>
  )
}
