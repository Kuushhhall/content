import { useEffect, useState } from 'react'

import { getStatusWsUrl } from '../lib/api'
import type { StatusFeed } from '../types'

export function useStatusSocket(): StatusFeed | null {
  const [status, setStatus] = useState<StatusFeed | null>(null)

  useEffect(() => {
    const ws = new WebSocket(getStatusWsUrl())
    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(String(event.data)) as StatusFeed
        setStatus(payload)
      } catch {
        // Ignore malformed payloads
      }
    }
    return () => ws.close()
  }, [])

  return status
}
