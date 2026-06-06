/**
 * NEXUS Sim v2 — Custom server wrapping Next.js + Socket.io
 *
 * Usage:
 *   node --max-old-space-size=1024 server.mjs
 *
 * Replaces `next start` with a custom HTTP server so Socket.io
 * can share the same port.  Next.js handles all page/API routes;
 * Socket.io handles real-time collaboration on the /socket.io path.
 */

import { createServer } from 'http'
import next from 'next'
import { Server as SocketIO } from 'socket.io'

const dev = process.env.NODE_ENV !== 'production'
const hostname = '0.0.0.0'
const port = parseInt(process.env.PORT || '3000', 10)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  /* ── HTTP server ─────────────────────────────────────────── */
  const server = createServer((req, res) => {
    // Let Next.js handle everything (pages, API routes, static files)
    handle(req, res)
  })

  /* ── Socket.io ───────────────────────────────────────────── */
  const io = new SocketIO(server, {
    cors: { origin: '*' },
    path: '/socket.io',
    // Polling + websocket for maximum compatibility through Caddy proxy
    transports: ['polling', 'websocket'],
  })

  // ── Connection lifecycle ──────────────────────────────────
  io.on('connection', (socket) => {
    console.log(`[socket.io] Client connected: ${socket.id}`)

    /* join / leave project rooms */
    socket.on('join-project', (projectId) => {
      socket.join(`project:${projectId}`)
      socket.data.projectId = projectId

      const room = io.sockets.adapter.rooms.get(`project:${projectId}`)
      const userCount = room?.size || 1

      // Tell the joiner how many people are here
      socket.emit('room-info', { projectId, userCount })

      // Tell everyone else someone joined
      socket.to(`project:${projectId}`).emit('user-joined', {
        socketId: socket.id,
        timestamp: Date.now(),
      })
    })

    socket.on('leave-project', (projectId) => {
      socket.leave(`project:${projectId}`)
      socket.to(`project:${projectId}`).emit('user-left', {
        socketId: socket.id,
        timestamp: Date.now(),
      })
    })

    /* real-time cursor sharing */
    socket.on('cursor-move', (data) => {
      if (socket.data.projectId) {
        socket.to(`project:${socket.data.projectId}`).emit('remote-cursor', {
          socketId: socket.id,
          ...data,
          timestamp: Date.now(),
        })
      }
    })

    /* agent focus indicator — when a user clicks on an agent card */
    socket.on('agent-focus', (data) => {
      if (socket.data.projectId) {
        socket.to(`project:${socket.data.projectId}`).emit('remote-focus', {
          socketId: socket.id,
          ...data,
          timestamp: Date.now(),
        })
      }
    })

    /* disconnect — notify room */
    socket.on('disconnect', () => {
      if (socket.data.projectId) {
        socket.to(`project:${socket.data.projectId}`).emit('user-left', {
          socketId: socket.id,
          timestamp: Date.now(),
        })
      }
      console.log(`[socket.io] Client disconnected: ${socket.id}`)
    })
  })

  /* ── Start listening ─────────────────────────────────────── */
  server.listen(port, () => {
    console.log(`> NEXUS Sim ready on http://${hostname}:${port} (socket.io enabled)`)
  })
})
