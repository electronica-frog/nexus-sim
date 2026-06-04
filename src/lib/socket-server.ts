/**
 * socket-server.ts — Server-side Socket.io helpers
 *
 * NOTE: The actual Socket.io server is created inside server.mjs
 * because Next.js does not expose its internal HTTP server when
 * running via `next start`.  This module re-exports convenience
 * types and a documentation reference so that server-side code
 * (API routes, etc.) can import from a single place.
 *
 * When running via `server.mjs` the `io` instance lives in that
 * process scope.  Server-side route handlers in Next.js run in the
 * same process (standalone mode), so they can import this module
 * to access the shared `io` instance.
 */

import { Server as SocketIOServer } from 'socket.io'
import type { Server as HTTPServer } from 'http'

// ── Types ──────────────────────────────────────────────────────

export type { SocketIOServer, HTTPServer }

export interface CursorMovePayload {
  x: number
  y: number
  section: string
}

export interface AgentFocusPayload {
  agentId: string
  agentName: string
}

export interface RoomInfo {
  projectId: string
  userCount: number
}

export interface UserEvent {
  socketId: string
  timestamp: number
}

// ── Event names (shared constant so client & server stay in sync) ──

export const SOCKET_EVENTS = {
  /** Client → Server: join a project room */
  JOIN_PROJECT: 'join-project',
  /** Client → Server: leave a project room */
  LEAVE_PROJECT: 'leave-project',
  /** Client → Server: broadcast cursor position */
  CURSOR_MOVE: 'cursor-move',
  /** Client → Server: broadcast agent focus */
  AGENT_FOCUS: 'agent-focus',

  /** Server → Client: room metadata after joining */
  ROOM_INFO: 'room-info',
  /** Server → Client: another user joined */
  USER_JOINED: 'user-joined',
  /** Server → Client: another user left / disconnected */
  USER_LEFT: 'user-left',
  /** Server → Client: remote cursor position */
  REMOTE_CURSOR: 'remote-cursor',
  /** Server → Client: remote agent focus */
  REMOTE_FOCUS: 'remote-focus',
} as const

// ── Singleton holder ────────────────────────────────────────────
// When server.mjs bootstraps, it can call initSocketIO() to make
// the io instance available to API route handlers via getIO().

let _io: SocketIOServer | null = null

/**
 * Initialise and return the Socket.io server singleton.
 * Safe to call multiple times — subsequent calls return the
 * existing instance.
 */
export function initSocketIO(httpServer: HTTPServer): SocketIOServer {
  if (_io) return _io

  const { Server } = require('socket.io')
  _io = new Server(httpServer, {
    cors: { origin: '*' },
    path: '/socket.io',
    transports: ['polling', 'websocket'],
  })

  // Register the same handlers as server.mjs so that if someone
  // bootstraps through this module the behaviour is identical.
  _io.on('connection', (socket) => {
    console.log(`[socket.io] Client connected: ${socket.id}`)

    socket.on('join-project', (projectId: string) => {
      socket.join(`project:${projectId}`)
      socket.data.projectId = projectId
      const room = _io!.sockets.adapter.rooms.get(`project:${projectId}`)
      socket.emit('room-info', { projectId, userCount: room?.size || 1 })
      socket.to(`project:${projectId}`).emit('user-joined', {
        socketId: socket.id,
        timestamp: Date.now(),
      })
    })

    socket.on('leave-project', (projectId: string) => {
      socket.leave(`project:${projectId}`)
      socket.to(`project:${projectId}`).emit('user-left', {
        socketId: socket.id,
        timestamp: Date.now(),
      })
    })

    socket.on('cursor-move', (data: CursorMovePayload) => {
      if (socket.data.projectId) {
        socket.to(`project:${socket.data.projectId}`).emit('remote-cursor', {
          socketId: socket.id,
          ...data,
          timestamp: Date.now(),
        })
      }
    })

    socket.on('agent-focus', (data: AgentFocusPayload) => {
      if (socket.data.projectId) {
        socket.to(`project:${socket.data.projectId}`).emit('remote-focus', {
          socketId: socket.id,
          ...data,
          timestamp: Date.now(),
        })
      }
    })

    socket.on('disconnect', () => {
      if (socket.data.projectId) {
        socket.to(`project:${socket.data.projectId}`).emit('user-left', {
          socketId: socket.id,
          timestamp: Date.now(),
        })
      }
    })
  })

  return _io
}

/**
 * Retrieve the current Socket.io instance (or null if not initialised).
 * Useful from API routes that need to push events to connected clients.
 */
export function getIO(): SocketIOServer | null {
  return _io
}

/**
 * Emit an event to every client in a given project room.
 */
export function emitToProject(projectId: string, event: string, data: unknown) {
  if (_io) {
    _io.to(`project:${projectId}`).emit(event, { ...(data as object), timestamp: Date.now() })
  }
}
