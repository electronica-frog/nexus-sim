import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get('projectId')
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50', 10)

  if (!projectId) {
    return NextResponse.json({ error: 'Se requiere projectId' }, { status: 400 })
  }

  try {
    const logs = await db.systemLog.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
    })

    return NextResponse.json({ logs })
  } catch (error) {
    console.error('System logs error:', error)
    return NextResponse.json({ error: 'Error al obtener registros del sistema' }, { status: 500 })
  }
}
