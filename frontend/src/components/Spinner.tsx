import { Loader2 } from 'lucide-react'

interface SpinnerProps {
  size?: number
  className?: string
  label?: string
}

export function Spinner({ size = 18, className = '', label }: SpinnerProps) {
  return (
    <div className={`inline-flex flex-col items-center justify-center gap-3 ${className}`}>
      <div className="relative">
        <Loader2 size={size} className="animate-spin text-volt shadow-glow-volt" />
        <div className="absolute inset-0 animate-ping opacity-20 text-volt">
           <Loader2 size={size} />
        </div>
      </div>
      {label && (
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-dim/80 animate-pulse">
          {label}
        </span>
      )}
    </div>
  )
}
