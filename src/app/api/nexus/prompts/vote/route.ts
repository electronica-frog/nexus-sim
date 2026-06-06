import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// POST /api/nexus/prompts/vote — Vote on a prompt (increment votes)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { promptId, direction } = body

    if (!promptId) {
      return NextResponse.json({ error: 'Se requiere promptId' }, { status: 400 })
    }

    const prompt = await db.prompt.findUnique({ where: { id: promptId } })
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt no encontrado' }, { status: 404 })
    }

    const increment = direction === 'down' ? -1 : 1
    const newVotes = Math.max(0, prompt.votes + increment)

    const updated = await db.prompt.update({
      where: { id: promptId },
      data: { votes: newVotes },
    })

    return NextResponse.json({ prompt: updated, newVotes })
  } catch (error) {
    console.error('Vote error:', error)
    return NextResponse.json({ error: 'Error al votar' }, { status: 500 })
  }
}

// GET /api/nexus/prompts/vote?promptId=X — Get vote count
export async function GET(request: NextRequest) {
  const promptId = request.nextUrl.searchParams.get('promptId')

  if (!promptId) {
    return NextResponse.json({ error: 'Se requiere promptId' }, { status: 400 })
  }

  try {
    const prompt = await db.prompt.findUnique({
      where: { id: promptId },
      select: { id: true, votes: true },
    })

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt no encontrado' }, { status: 404 })
    }

    return NextResponse.json({ votes: prompt.votes })
  } catch (error) {
    console.error('Vote GET error:', error)
    return NextResponse.json({ error: 'Error al obtener votos' }, { status: 500 })
  }
}
