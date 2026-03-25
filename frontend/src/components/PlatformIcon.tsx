import React from 'react'

// Professional Brand SVG Icons
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

const RedditIcon = ({ size, className }: { size: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.051l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.056 1.597.04.282.063.535.063.817 0 2.15-2.834 3.896-6.333 3.896s-6.333-1.747-6.333-3.896c0-.282.022-.535.062-.817a1.747 1.747 0 0 1-1.055-1.597c0-.968.786-1.754 1.754-1.754.477 0 .899.182 1.207.491 1.194-.856 2.85-1.417 4.674-1.488l.82-3.818a.13.13 0 0 1 .157-.101l2.947.621a1.242 1.242 0 0 1 .438-.119zM8.515 11.227c-.692 0-1.256.563-1.256 1.256 0 .692.564 1.255 1.256 1.255s1.256-.563 1.256-1.255c0-.693-.564-1.256-1.256-1.256zm6.97 0c-.693 0-1.256.563-1.256 1.256 0 .692.563 1.255 1.256 1.255.692 0 1.255-.563 1.255-1.255s-.563-1.256-1.255-1.256zM9.194 16.035c.189.189.496.189.685 0 .548-.548 1.297-.859 2.12-.859.819 0 1.571.311 2.119.859.19.189.496.189.685 0 .19-.189.19-.496 0-.685a3.91 3.91 0 0 0-2.804-1.14 3.911 3.911 0 0 0-2.805 1.14c-.189.189-.189.496 0 .685z" />
  </svg>
)

const FramerIcon = ({ size, className }: { size: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M4 0h16v8h-8zM4 8h8l8 8H4zM4 16h8v8z" />
  </svg>
)

const MediumIcon = ({ size, className }: { size: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M13.54 12a6.8 6.8 0 11-6.77-6.82A6.77 6.77 0 0113.54 12zm7.42 0c0 3.54-1.51 6.42-3.38 6.42S14.2 15.54 14.2 12s1.51-6.42 3.38-6.42 3.38 2.88 3.38 6.42zM24 12c0 3.17-.31 5.75-.7 5.75s-.7-2.58-.7-5.75.31-5.75.7-5.75.7 2.58.7 5.75z" />
  </svg>
)

const platforms: Record<string, { icon: React.ElementType; label: string; color: string; glow: string }> = {
  linkedin: { icon: LinkedInIcon, label: 'LinkedIn', color: 'text-[#0A66C2]', glow: 'shadow-[0_0_20px_rgba(10,102,194,0.4)]' },
  x: { icon: XIcon, label: 'X', color: 'text-silver', glow: 'shadow-[0_0_20px_rgba(255,255,255,0.15)]' },
  reddit: { icon: RedditIcon, label: 'Reddit', color: 'text-[#FF4500]', glow: 'shadow-[0_0_20px_rgba(255,69,0,0.4)]' },
  framer: { icon: FramerIcon, label: 'Framer', color: 'text-amethyst', glow: 'shadow-glow-amethyst' },
  medium: { icon: MediumIcon, label: 'Medium', color: 'text-silver', glow: 'shadow-[0_0_20px_rgba(255,255,255,0.1)]' },
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

export function getPlatformLabel(platform: string): string {
  return platforms[platform]?.label ?? platform
}

export const PLATFORMS = ['linkedin', 'x', 'reddit', 'framer', 'medium'] as const
