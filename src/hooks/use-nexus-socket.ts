'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { SOCKET_EVENTS } from '@/lib/socket-server'

interface UseNexusSocketReturn {
  connected: boolean
  userCount: number
  remoteCursors: Map<string, { x: number; y: number; section: string }>
  remoteFocus: { agentId: string; agentName: string; socketId: string } | null
  socket: Socket | null
}

/**
 * Socket.io client hook for NEXUS real-time collaboration.
 * Connects to the Socket.io server, joins a project room,
 * and handles cursor sharing + agent focus indicators.
 */
export function useNexusSocket(
  projectId: string | undefined,
  options?: { enabled?: boolean }
): UseNexusSocketReturn {
  const enabled = options?.enabled ?? true
  const socketRef = useRef<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [userCount, setUserCount] = useState(0)
  const [remoteCursors, setRemoteCursors] = useState<
    Map<string, { x: number; y: number; section: string }>
  >(new Map())
  const [remoteFocus, setRemoteFocus] = useState<{
    agentId: string
    agentName: string
    socketId: string
  } | null>(null)

  // Initialize socket connection
  useEffect(() => {
    if (!projectId || !enabled) {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
      return
    }

    const socket = io({
      transports: ['polling', 'websocket'],
      path: '/socket.io',
    })
    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)
      socket.emit(SOCKET_EVENTS.JOIN_PROJECT, projectId)
    })

    socket.on(SOCKET_EVENTS.ROOM_INFO, (data: { projectId: string; userCount: number }) => {
      setUserCount(data.userCount)
    })

    socket.on(SOCKET_EVENTS.USER_JOINED, () => {
      // Re-fetch room size by requesting room-info
      socket.emit(SOCKET_EVENTS.JOIN_PROJECT, projectId) // re-join triggers room-info
    })

    socket.on(SOCKET_EVENTS.USER_LEFT, () => {
      socket.emit(SOCKET_EVENTS.JOIN_PROJECT, projectId) // re-join triggers room-info
    })

    socket.on(SOCKET_EVENTS.REMOTE_CURSOR, (data: { socketId: string; x: number; y: number; section: string }) => {
      setRemoteCursors((prev) => {
        const next = new Map(prev)
        next.set(data.socketId, { x: data.x, y: data.y, section: data.section })
        return next
      })
    })

    socket.on(SOCKET_EVENTS.REMOTE_FOCUS, (data: { socketId: string; agentId: string; agentName: string }) => {
      setRemoteFocus({ agentId: data.agentId, agentName: data.agentName, socketId: data.socketId })
      // Auto-clear after 3 seconds (store ref for cleanup)
      const timer = setTimeout(() => setRemoteFocus(null), 3000)
      ;(socket as unknown as Record<string, unknown>)._focusTimer = timer
    })

    socket.on('disconnect', () => {
      setConnected(false)
      setUserCount(0)
      setRemoteCursors(new Map())
    })

    return () => {
      // Clear pending focus timer
      const pendingTimer = (socket as unknown as Record<string, unknown>)._focusTimer as ReturnType<typeof setTimeout> | undefined
      if (pendingTimer) clearTimeout(pendingTimer)
      socket.disconnect()
      socketRef.current = null
      setConnected(false)
    }
  }, [projectId, enabled])

  return { connected, userCount, remoteCursors, remoteFocus, socket: socketRef.current }
}
