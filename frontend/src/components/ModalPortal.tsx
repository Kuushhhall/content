import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

interface ModalPortalProps {
  children: React.ReactNode
}

export function ModalPortal({ children }: ModalPortalProps) {
  const [container, setContainer] = useState<HTMLElement | null>(null)

  useEffect(() => {
    // Create a container div appended to document.body
    const div = document.createElement('div')
    div.id = 'modal-portal'
    document.body.appendChild(div)
    setContainer(div)

    // Cleanup on unmount
    return () => {
      if (document.body.contains(div)) {
        document.body.removeChild(div)
      }
    }
  }, [])

  if (!container) {
    return null
  }

  return createPortal(children, container)
}