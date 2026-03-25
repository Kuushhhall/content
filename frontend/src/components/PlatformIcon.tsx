import { Hash, MessageSquare, Layout, BookOpen, Briefcase } from 'lucide-react'

const platforms: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  linkedin: { icon: Briefcase, label: 'LinkedIn', color: 'text-blue-400' },
  x: { icon: Hash, label: 'X / Twitter', color: 'text-cream' },
  reddit: { icon: MessageSquare, label: 'Reddit', color: 'text-orange-400' },
  framer: { icon: Layout, label: 'Framer', color: 'text-purple-400' },
  medium: { icon: BookOpen, label: 'Medium', color: 'text-green-400' },
}

interface PlatformIconProps {
  platform: string
  size?: number
  showLabel?: boolean
  className?: string
}

export function PlatformIcon({ platform, size = 16, showLabel = false, className = '' }: PlatformIconProps) {
  const p = platforms[platform] ?? { icon: Layout, label: platform, color: 'text-muted' }
  const Icon = p.icon
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <Icon size={size} className={p.color} />
      {showLabel && <span className="text-sm font-medium text-cream">{p.label}</span>}
    </span>
  )
}

export function getPlatformLabel(platform: string): string {
  return platforms[platform]?.label ?? platform
}

export const PLATFORMS = ['linkedin', 'x', 'reddit', 'framer', 'medium'] as const
