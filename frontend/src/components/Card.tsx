import type { PropsWithChildren } from 'react'
import { motion } from 'framer-motion'

interface CardProps {
  className?: string
  hover?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
  onClick?: () => void
  variant?: 'default' | 'outline' | 'ghost'
}

const paddings = { none: 'p-0', sm: 'p-3', md: 'p-4', lg: 'p-6' }
const variants = {
  default: 'card',
  outline: 'border border-border-primary bg-transparent',
  ghost: 'bg-transparent',
}

export function Card({
  children,
  className = '',
  hover = false,
  padding = 'md',
  onClick,
  variant = 'default'
}: PropsWithChildren<CardProps>) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className={`
        ${variants[variant]}
        ${paddings[padding]}
        ${hover ? 'card-hover cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </motion.div>
  )
}
