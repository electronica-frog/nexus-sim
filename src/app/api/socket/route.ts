import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/socket
 *
 * Returns Socket.io availability info so the client can confirm
 * the real-time layer is reachable before attempting to connect.
 *
 * NOTE: Socket.io is served on the /socket.io path by the
 * custom HTTP server (server.mjs).  This API route exists purely
 * as a health-check / feature-detection endpoint.
 */
export async function GET() {
  return NextResponse.json({
    socketIO: true,
    path: '/socket.io',
    transports: ['polling', 'websocket'],
  })
}
