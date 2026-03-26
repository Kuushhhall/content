import { useEffect, useState, useRef, useCallback } from 'react'

import { getStatusWsUrl } from '../lib/api'
import type { StatusFeed } from '../types'

const RECONNECT_DELAY = 3000 // 3 seconds
const MAX_RECONNECT_ATTEMPTS = 10

export function useStatusSocket(): StatusFeed | null {
  const [status, setStatus] = useState<StatusFeed | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const connect = useCallback(() => {
    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.close()
    }

    try {
      const ws = new WebSocket(getStatusWsUrl())
      wsRef.current = ws

      ws.onopen = () => {
        // Reset reconnect attempts on successful connection
        reconnectAttemptsRef.current = 0
      }

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(String(event.data)) as StatusFeed
          setStatus(payload)
        } catch {
          // Ignore malformed payloads
        }
      }

      ws.onerror = () => {
        // Error will trigger onclose, which handles reconnection
      }

      ws.onclose = (event) => {
        // Only attempt to reconnect if not a clean close and under max attempts
        if (!event.wasClean && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current += 1
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, RECONNECT_DELAY)
        }
      }
    } catch {
      // WebSocket creation failed, will retry on next attempt
      if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttemptsRef.current += 1
        reconnectTimeoutRef.current = setTimeout(() => {
          connect()
        }, RECONNECT_DELAY)
      }
    }
  }, [])

  useEffect(() => {
    connect()

    return () => {
      // Clean up on unmount
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [connect])

  return status
}
