import { useEffect, useState, useRef } from 'react'

import { getStatusWsUrl } from '../lib/api'
import type { StatusFeed } from '../types'

const RECONNECT_DELAY = 3000
const MAX_RECONNECT_ATTEMPTS = 10

export function useStatusSocket(): StatusFeed | null {
  const [status, setStatus] = useState<StatusFeed | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const connectRef = useRef<() => void>(() => {})

  useEffect(() => {
    function connect() {
      if (wsRef.current) {
        wsRef.current.close()
      }
      try {
        const ws = new WebSocket(getStatusWsUrl())
        wsRef.current = ws

        ws.onopen = () => {
          reconnectAttemptsRef.current = 0
        }

        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(String(event.data)) as StatusFeed
            setStatus(payload)
          } catch {
            // ignore malformed payloads
          }
        }

        ws.onerror = () => {
          // onclose will handle reconnect
        }

        ws.onclose = (event) => {
          if (!event.wasClean && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttemptsRef.current += 1
            reconnectTimeoutRef.current = setTimeout(() => {
              connectRef.current()
            }, RECONNECT_DELAY)
          }
        }
      } catch {
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current += 1
          reconnectTimeoutRef.current = setTimeout(() => {
            connectRef.current()
          }, RECONNECT_DELAY)
        }
      }
    }

    connectRef.current = connect
    connect()

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])

  return status
}
