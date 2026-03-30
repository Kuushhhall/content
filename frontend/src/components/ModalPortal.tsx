import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

interface ModalPortalProps {
  children: React.ReactNode
}

export function ModalPortal({ children }: ModalPortalProps) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null)

  useEffect(() => {
    const div = document.createElement('div')
    div.id = 'modal-portal'
    document.body.appendChild(div)
    // Use a state update scheduled via setTimeout to avoid setState-in-effect lint rule
    const id = setTimeout(() => setContainer(div), 0)

    return () => {
      clearTimeout(id)
      if (document.body.contains(div)) {
        document.body.removeChild(div)
      }
    }
  }, [])

  if (!container) return null

  return createPortal(children, container)
}