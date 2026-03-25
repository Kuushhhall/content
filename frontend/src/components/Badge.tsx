interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'amber' | 'success' | 'danger' | 'info' | 'muted'
  size?: 'sm' | 'md'
  dot?: boolean
  className?: string
}

const variants = {
  default: 'border-stroke bg-ink/60 text-cream',
  amber: 'border-amber/40 bg-amber/10 text-amber',
  success: 'border-success/40 bg-success/10 text-success',
  danger: 'border-danger/40 bg-danger/10 text-danger',
  info: 'border-info/40 bg-info/10 text-info',
  muted: 'border-stroke bg-ink/40 text-muted',
}

const sizes = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-1 text-xs',
}

export function Badge({ children, variant = 'default', size = 'sm', dot, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium uppercase tracking-wider ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {dot && (
        <span className={`h-1.5 w-1.5 rounded-full ${
          variant === 'success' ? 'bg-success animate-pulse-slow' :
          variant === 'danger' ? 'bg-danger' :
          variant === 'amber' ? 'bg-amber animate-pulse-slow' :
          variant === 'info' ? 'bg-info' :
          'bg-muted'
        }`} />
      )}
      {children}
    </span>
  )
}
