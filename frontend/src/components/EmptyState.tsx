import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: React.ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 rounded-2xl border border-stroke/50 bg-ink/40 p-4">
        <Icon size={28} className="text-muted-dim" />
      </div>
      <h3 className="mb-1 text-sm font-semibold text-cream">{title}</h3>
      <p className="mb-4 max-w-xs text-xs text-muted">{description}</p>
      {action}
    </div>
  )
}
