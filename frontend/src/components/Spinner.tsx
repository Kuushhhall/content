import { Loader2 } from 'lucide-react'

interface SpinnerProps {
  size?: number
  className?: string
  label?: string
}

export function Spinner({ size = 18, className = '', label }: SpinnerProps) {
  return (
    <span className={`inline-flex items-center gap-2 text-muted ${className}`}>
      <Loader2 size={size} className="animate-spin" />
      {label && <span className="text-sm">{label}</span>}
    </span>
  )
}
