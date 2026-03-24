import type { PropsWithChildren } from 'react'

export function Card({ children, className = '' }: PropsWithChildren<{ className?: string }>) {
  return (
    <section
      className={`rounded-2xl border border-stroke/70 bg-panel/70 p-4 shadow-editorial backdrop-blur-sm ${className}`}
    >
      {children}
    </section>
  )
}
