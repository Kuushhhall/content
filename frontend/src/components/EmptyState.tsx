import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: React.ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
      <div className="relative mb-8 group">
        <div className="absolute inset-0 bg-volt/20 blur-[40px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        <div className="relative flex h-24 w-24 items-center justify-center rounded-[2.5rem] border border-graphite/40 bg-stellar/40 shadow-glow-volt/5 backdrop-blur-3xl transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
          <Icon size={44} className="text-volt drop-shadow-glow-volt" strokeWidth={1.5} />
        </div>
      </div>
      <h3 className="mb-3 text-2xl font-serif font-bold tracking-tight text-silver">{title}</h3>
      <p className="mb-8 max-w-sm text-sm font-medium leading-relaxed text-dim/80">{description}</p>
      {action && (
        <div className="animate-float">
          {action}
        </div>
      )}
    </div>
  )
}
