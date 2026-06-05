import { NextRequest } from 'next/server'
import { getEventBus, NEXUS_EVENTS } from '@/lib/event-bus'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes keep-alive

function sseEvent(event: string, data: object): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

// GET /api/nexus/live?projectId=xxx
// Returns: SSE stream of events for this project
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')

  if (!projectId) {
    return new Response(JSON.stringify({ error: 'Se requiere projectId' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const encoder = new TextEncoder()
  const eventBus = getEventBus()

  const stream = new ReadableStream({
    start(controller) {
      let heartbeatInterval: ReturnType<typeof setInterval> | null = null
      const unsubscribers: Array<() => void> = []

      // Subscribe to all relevant events
      const eventsToListen = [
        NEXUS_EVENTS.WAVE_STARTED,
        NEXUS_EVENTS.WAVE_AGENT_RESPONDING,
        NEXUS_EVENTS.WAVE_COMPLETED,
        NEXUS_EVENTS.PIPELINE_STARTED,
        NEXUS_EVENTS.PIPELINE_STEP_COMPLETED,
        NEXUS_EVENTS.PIPELINE_COMPLETED,
        NEXUS_EVENTS.AGENT_STATUS_CHANGED,
        NEXUS_EVENTS.PROJECT_UPDATED,
      ]

      for (const eventType of eventsToListen) {
        const unsubscribe = eventBus.on(eventType, (nexusEvent) => {
          // Only forward events for this project (or global events)
          if (nexusEvent.projectId && nexusEvent.projectId !== projectId) {
            return
          }
          try {
            controller.enqueue(
              encoder.encode(
                sseEvent(nexusEvent.event, {
                  ...nexusEvent.data,
                  timestamp: nexusEvent.timestamp,
                })
              )
            )
          } catch {
            // Controller may have been closed
          }
        })
        unsubscribers.push(unsubscribe)
      }

      // Send initial connection event
      try {
        controller.enqueue(
          encoder.encode(
            sseEvent('connected', {
              message: 'Conectado al canal en tiempo real',
              projectId,
              connectionCount: eventBus.getConnectionCount(),
              timestamp: Date.now(),
            })
          )
        )
      } catch {
        // ignore
      }

      // Heartbeat every 5 seconds with connection count
      heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(
            encoder.encode(
              sseEvent(NEXUS_EVENTS.HEARTBEAT, {
                connectionCount: eventBus.getConnectionCount(),
                timestamp: Date.now(),
              })
            )
          )
        } catch {
          // Controller closed, clean up
          if (heartbeatInterval) clearInterval(heartbeatInterval)
          for (const unsub of unsubscribers) unsub()
        }
      }, 5000)

      // Cleanup on abort signal
      request.signal.addEventListener('abort', () => {
        if (heartbeatInterval) clearInterval(heartbeatInterval)
        for (const unsub of unsubscribers) unsub()
        try {
          controller.close()
        } catch {
          // already closed
        }
      })
    },
    cancel() {
      // Cleanup when stream is cancelled
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  })
}
