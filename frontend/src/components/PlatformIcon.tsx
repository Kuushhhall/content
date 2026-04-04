import React from 'react'

const LinkedInIcon = ({ size, className }: { size: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
  </svg>
)

const XIcon = ({ size, className }: { size: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
)

const FramerIcon = ({ size, className }: { size: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M4 0h16v8h-8zM4 8h8l8 8H4zM4 16h8v8z" />
  </svg>
)

const platforms: Record<string, { icon: React.ElementType; label: string; color: string; glow: string }> = {
  linkedin: { icon: LinkedInIcon, label: 'LinkedIn', color: 'text-[#0A66C2]', glow: 'shadow-[0_0_20px_rgba(10,102,194,0.4)]' },
  x: { icon: XIcon, label: 'X', color: 'text-silver', glow: 'shadow-[0_0_20px_rgba(255,255,255,0.15)]' },
  framer: { icon: FramerIcon, label: 'Framer', color: 'text-amethyst', glow: 'shadow-glow-amethyst' },
}

interface PlatformIconProps {
  platform: string
  size?: number
  showLabel?: boolean
  className?: string
  glow?: boolean
}

export function PlatformIcon({ platform, size = 16, showLabel = false, className = '', glow = false }: PlatformIconProps) {
  const p = platforms[platform] ?? { icon: () => null, label: platform, color: 'text-dim', glow: '' }
  const Icon = p.icon
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <div className={`flex items-center justify-center transition-all duration-300 ${glow ? p.glow : ''}`}>
        <Icon size={size} className={p.color} />
      </div>
      {showLabel && <span className="text-[10px] font-black uppercase tracking-widest text-silver/80">{p.label}</span>}
    </span>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function getPlatformLabel(platform: string): string {
  return platforms[platform]?.label ?? platform
}
