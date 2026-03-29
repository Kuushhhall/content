interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  dot?: boolean
  className?: string
}

const variants = {
  default: 'badge-secondary',
  primary: 'badge-primary',
  secondary: 'badge-secondary',
  success: 'badge-success',
  warning: 'badge-warning',
  danger: 'badge-danger',
}

const sizes = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm',
}

export function Badge({ children, variant = 'default', size = 'sm', dot, className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${variants[variant]} ${sizes[size]} ${className}`}>
      {dot && (
        <span className={`h-1.5 w-1.5 rounded-full ${
          variant === 'primary' ? 'bg-accent-primary' :
          variant === 'success' ? 'bg-accent-success' :
          variant === 'warning' ? 'bg-accent-warning' :
          variant === 'danger' ? 'bg-accent-danger' :
          'bg-text-secondary'
        }`} />
      )}
      {children}
    </span>
  )
}
