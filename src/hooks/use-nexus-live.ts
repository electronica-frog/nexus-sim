'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'

export interface NexusEvent {
  event: string
  data: any
  timestamp: number
}

interface UseNexusLiveOptions {
  maxEvents?: number
}

interface UseNexusLiveReturn {
  connected: boolean
  connectionCount: number
  lastEvent: NexusEvent | null
  events: NexusEvent[]
  clearEvents: () => void
}

export function useNexusLive(
  projectId: string | undefined,
  options?: UseNexusLiveOptions
): UseNexusLiveReturn {
  const maxEvents = options?.maxEvents ?? 100

  const [connected, setConnected] = useState(false)
  const [connectionCount, setConnectionCount] = useState(0)
  const [lastEvent, setLastEvent] = useState<NexusEvent | null>(null)
  const [events, setEvents] = useState<NexusEvent[]>([])
  const eventSourceRef = useRef<EventSource | null>(null)

  const clearEvents = useCallback(() => {
    setEvents([])
    setLastEvent(null)
  }, [])

  const maxEventsRef = useRef(maxEvents)
  useEffect(() => { maxEventsRef.current = maxEvents }, [maxEvents])

  // Derive effective connected state — if no projectId, we're disconnected
  const effectiveConnected = projectId ? connected : false
  const effectiveConnectionCount = projectId ? connectionCount : 0

  useEffect(() => {
    if (!projectId) {
      // When no projectId, close any existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      return
    }

    // Cleanup previous connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    const eventSource = new EventSource(`/api/nexus/live?projectId=${projectId}`)
    eventSourceRef.current = eventSource

    // Connected
    eventSource.addEventListener('connected', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data)
        setConnected(true)
        setConnectionCount(data.connectionCount ?? 1)
        setEvents((prev) => [...prev.slice(-(maxEventsRef.current - 1)), {
          event: 'connected',
          data,
          timestamp: data.timestamp ?? Date.now(),
        }])
      } catch {
        setConnected(true)
      }
    })

    // Heartbeat
    eventSource.addEventListener('heartbeat', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data)
        setConnectionCount(data.connectionCount ?? 0)
        setEvents((prev) => {
          // Replace last heartbeat or add new one
          const filtered = prev.filter((ev) => ev.event !== 'heartbeat')
          return [...filtered.slice(-(maxEventsRef.current - 1)), {
            event: 'heartbeat',
            data,
            timestamp: data.timestamp ?? Date.now(),
          }]
        })
      } catch {
        // ignore parse errors
      }
    })

    // Wave events
    const waveEvents = [
      'wave:started',
      'wave:agent_responding',
      'wave:completed',
      'pipeline:started',
      'pipeline:step_completed',
      'pipeline:completed',
      'agent:status_changed',
      'project:updated',
    ]

    for (const eventType of waveEvents) {
      eventSource.addEventListener(eventType, (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data)
          const nexusEvent: NexusEvent = {
            event: eventType,
            data,
            timestamp: data.timestamp ?? Date.now(),
          }
          setLastEvent(nexusEvent)
          setEvents((prev) => [...prev.slice(-(maxEventsRef.current - 1)), nexusEvent])
          setConnectionCount(data.connectionCount ?? 0)
        } catch {
          // ignore parse errors
        }
      })
    }

    // Error handling — only fires as callback from EventSource, not synchronously
    eventSource.onerror = () => {
      setConnected(false)
      setConnectionCount(0)
    }

    return () => {
      eventSource.close()
      eventSourceRef.current = null
      setConnected(false)
    }
  }, [projectId])

  return {
    connected: effectiveConnected,
    connectionCount: effectiveConnectionCount,
    lastEvent,
    events,
    clearEvents,
  }
}
