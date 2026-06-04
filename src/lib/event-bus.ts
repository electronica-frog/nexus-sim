// ===== NEXUS Real-Time Event Bus =====
// In-memory pub/sub event bus with singleton pattern for hot-reload persistence.
// Used to broadcast events to OTHER connected clients (multi-user collaboration).

type EventCallback = (data: any) => void

interface NexusEvent {
  event: string
  data: any
  timestamp: number
  projectId?: string
}

interface EventBus {
  on(event: string, callback: EventCallback): () => void
  off(event: string, callback: EventCallback): void
  emit(event: string, data: any): void
  getListeners(event: string): number
  getConnectionCount(): number
}

// Supported event types
export const NEXUS_EVENTS = {
  WAVE_STARTED: 'wave:started',
  WAVE_AGENT_RESPONDING: 'wave:agent_responding',
  WAVE_COMPLETED: 'wave:completed',
  PIPELINE_STARTED: 'pipeline:started',
  PIPELINE_STEP_COMPLETED: 'pipeline:step_completed',
  PIPELINE_COMPLETED: 'pipeline:completed',
  AGENT_STATUS_CHANGED: 'agent:status_changed',
  PROJECT_UPDATED: 'project:updated',
  HEARTBEAT: 'heartbeat',
} as const

class NexusEventBus implements EventBus {
  private listeners: Map<string, Set<EventCallback>> = new Map()
  private connectionCount: number = 0

  on(event: string, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)

    // Increment connection count for each new subscription
    this.connectionCount++

    // Return unsubscribe function
    return () => {
      const eventListeners = this.listeners.get(event)
      if (eventListeners) {
        eventListeners.delete(callback)
        if (eventListeners.size === 0) {
          this.listeners.delete(event)
        }
      }
      this.connectionCount = Math.max(0, this.connectionCount - 1)
    }
  }

  off(event: string, callback: EventCallback): void {
    const eventListeners = this.listeners.get(event)
    if (eventListeners) {
      eventListeners.delete(callback)
      if (eventListeners.size === 0) {
        this.listeners.delete(event)
      }
    }
  }

  emit(event: string, data: any): void {
    const eventListeners = this.listeners.get(event)
    if (eventListeners) {
      const nexusEvent: NexusEvent = {
        event,
        data,
        timestamp: Date.now(),
        projectId: data?.projectId,
      }
      for (const callback of eventListeners) {
        try {
          callback(nexusEvent)
        } catch (err) {
          console.error(`[NexusEventBus] Error in listener for "${event}":`, err)
        }
      }
    }
  }

  getListeners(event: string): number {
    return this.listeners.get(event)?.size ?? 0
  }

  getConnectionCount(): number {
    return this.connectionCount
  }
}

// Singleton pattern using globalThis for hot-reload persistence
const globalForNexusBus = globalThis as unknown as {
  NEXUS_EVENT_BUS: NexusEventBus | undefined
}

export function getEventBus(): EventBus {
  if (!globalForNexusBus.NEXUS_EVENT_BUS) {
    globalForNexusBus.NEXUS_EVENT_BUS = new NexusEventBus()
    console.log('[NexusEventBus] New singleton instance created')
  }
  return globalForNexusBus.NEXUS_EVENT_BUS
}

// Convenience emit helpers
export function emitWaveStarted(data: { waveId: string; type: string; prompt: string; projectId: string }) {
  getEventBus().emit(NEXUS_EVENTS.WAVE_STARTED, data)
}

export function emitWaveAgentResponding(data: { waveId: string; agentName: string; agentEmoji: string; projectId: string }) {
  getEventBus().emit(NEXUS_EVENTS.WAVE_AGENT_RESPONDING, data)
}

export function emitWaveCompleted(data: { waveId: string; type: string; responseCount: number; projectId: string }) {
  getEventBus().emit(NEXUS_EVENTS.WAVE_COMPLETED, data)
}

export function emitPipelineStarted(data: { steps: string[]; projectId: string }) {
  getEventBus().emit(NEXUS_EVENTS.PIPELINE_STARTED, data)
}

export function emitPipelineStepCompleted(data: { step: string; stepIndex: number; projectId: string }) {
  getEventBus().emit(NEXUS_EVENTS.PIPELINE_STEP_COMPLETED, data)
}

export function emitPipelineCompleted(data: { totalSteps: number; projectId: string }) {
  getEventBus().emit(NEXUS_EVENTS.PIPELINE_COMPLETED, data)
}

export function emitAgentStatusChanged(data: { agentId: string; status: string; projectId: string }) {
  getEventBus().emit(NEXUS_EVENTS.AGENT_STATUS_CHANGED, data)
}

export function emitProjectUpdated(data: { field: string; value: any; projectId: string }) {
  getEventBus().emit(NEXUS_EVENTS.PROJECT_UPDATED, data)
}
