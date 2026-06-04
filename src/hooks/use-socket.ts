'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'

/* ── Types ─────────────────────────────────────────────────── */

interface CursorPosition {
  x: number
  y: number
  section: string
}

interface AgentFocus {
  agentId: string
  agentName: string
}

export interface UseSocketReturn {
  /** The raw Socket.io socket instance (null until connected) */
  socket: Socket | null
  /** Whether the client is currently connected */
  connected: boolean
  /** Number of users in the current project room (1 = just you) */
  userCount: number
  /** Map of socketId → cursor position for other users */
  remoteCursors: Map<string, CursorPosition>
  /** Map of socketId → agent focus for other users */
  remoteFocus: Map<string, AgentFocus>
  /** Join a project collaboration room */
  joinProject: (projectId: string) => void
  /** Leave the current project room */
  leaveProject: () => void
  /** Broadcast your cursor position to other users */
  sendCursorMove: (x: number, y: number, section: string) => void
  /** Broadcast which agent you're focusing on */
  sendAgentFocus: (agentId: string, agentName: string) => void
}

/* ── Hook ──────────────────────────────────────────────────── */

export function useSocket(): UseSocketReturn {
  const socketRef = useRef<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [userCount, setUserCount] = useState(1)
  const [remoteCursors, setRemoteCursors] = useState<Map<string, CursorPosition>>(new Map())
  const [remoteFocus, setRemoteFocus] = useState<Map<string, AgentFocus>>(new Map())
  const currentProjectRef = useRef<string | null>(null)

  useEffect(() => {
    const socket = io(window.location.origin, {
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    })
    socketRef.current = socket

    /* ── lifecycle ─────────────────────────────────────── */
    socket.on('connect', () => {
      setConnected(true)
      console.log('[socket.io] Connected:', socket.id)
      // Rejoin the project room if we were in one before disconnect
      if (currentProjectRef.current) {
        socket.emit('join-project', currentProjectRef.current)
      }
    })

    socket.on('disconnect', () => {
      setConnected(false)
    })

    /* ── room events ──────────────────────────────────── */
    socket.on('room-info', (data: { projectId: string; userCount: number }) => {
      setUserCount(data.userCount || 1)
    })

    socket.on('user-joined', () => {
      setUserCount((c) => c + 1)
    })

    socket.on('user-left', () => {
      setUserCount((c) => Math.max(1, c - 1))
    })

    /* ── remote cursor ────────────────────────────────── */
    socket.on(
      'remote-cursor',
      (data: { socketId: string; x: number; y: number; section: string }) => {
        setRemoteCursors((prev) => {
          const next = new Map(prev)
          next.set(data.socketId, { x: data.x, y: data.y, section: data.section })
          // Auto-expire cursor after 3 s of inactivity
          setTimeout(() => {
            setRemoteCursors((p) => {
              const n = new Map(p)
              n.delete(data.socketId)
              return n
            })
          }, 3000)
          return next
        })
      },
    )

    /* ── remote focus ─────────────────────────────────── */
    socket.on(
      'remote-focus',
      (data: { socketId: string; agentId: string; agentName: string }) => {
        setRemoteFocus((prev) => {
          const next = new Map(prev)
          next.set(data.socketId, { agentId: data.agentId, agentName: data.agentName })
          // Auto-expire focus after 5 s
          setTimeout(() => {
            setRemoteFocus((p) => {
              const n = new Map(p)
              n.delete(data.socketId)
              return n
            })
          }, 5000)
          return next
        })
      },
    )

    /* ── cleanup ──────────────────────────────────────── */
    return () => {
      socket.disconnect()
      socketRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── Callbacks ────────────────────────────────────────── */

  const joinProject = useCallback((projectId: string) => {
    currentProjectRef.current = projectId
    socketRef.current?.emit('join-project', projectId)
  }, [])

  const leaveProject = useCallback(() => {
    if (currentProjectRef.current) {
      socketRef.current?.emit('leave-project', currentProjectRef.current)
    }
    currentProjectRef.current = null
    setUserCount(1)
  }, [])

  const sendCursorMove = useCallback((x: number, y: number, section: string) => {
    socketRef.current?.emit('cursor-move', { x, y, section })
  }, [])

  const sendAgentFocus = useCallback((agentId: string, agentName: string) => {
    socketRef.current?.emit('agent-focus', { agentId, agentName })
  }, [])

  return {
    socket: socketRef.current,
    connected,
    userCount,
    remoteCursors,
    remoteFocus,
    joinProject,
    leaveProject,
    sendCursorMove,
    sendAgentFocus,
  }
}
