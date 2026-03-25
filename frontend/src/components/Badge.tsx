interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'amber' | 'success' | 'danger' | 'info' | 'muted' | 'volt' | 'amethyst'
  size?: 'sm' | 'md' | 'lg'
  dot?: boolean
  className?: string
}

const variants = {
  default: 'border-graphite/40 bg-stellar/40 text-silver',
  amber: 'border-amber/40 bg-amber/10 text-amber shadow-glow-amber/5',
  success: 'border-success/40 bg-success/10 text-success shadow-glow-success/5',
  danger: 'border-danger/40 bg-danger/10 text-danger shadow-glow-danger/5',
  info: 'border-info/40 bg-info/10 text-info shadow-glow-info/5',
  muted: 'border-graphite/20 bg-void/30 text-dim',
  volt: 'border-volt/40 bg-volt/10 text-volt shadow-glow-volt/10',
  amethyst: 'border-amethyst/40 bg-amethyst/10 text-amethyst shadow-glow-amethyst/10',
}

const sizes = {
  sm: 'px-2 py-0.5 text-[9px]',
  md: 'px-2.5 py-1 text-[10px]',
  lg: 'px-3 py-1.5 text-xs',
}

export function Badge({ children, variant = 'default', size = 'sm', dot, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-lg border font-black uppercase tracking-[0.1em] transition-all duration-300 ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {dot && (
        <span className={`h-1.5 w-1.5 rounded-full ${
          variant === 'success' ? 'bg-success animate-pulse shadow-glow-success' :
          variant === 'volt' ? 'bg-volt animate-pulse shadow-glow-volt' :
          variant === 'danger' ? 'bg-danger' :
          variant === 'amber' ? 'bg-amber animate-pulse' :
          variant === 'info' ? 'bg-info animate-pulse' :
          variant === 'amethyst' ? 'bg-amethyst animate-pulse shadow-glow-amethyst' :
          'bg-dim'
        }`} />
      )}
      {children}
    </span>
  )
}
