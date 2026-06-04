import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get('projectId')

  if (!projectId) {
    return NextResponse.json({ error: 'Se requiere projectId' }, { status: 400 })
  }

  try {
    const waves = await db.wave.findMany({
      where: { projectId, status: 'completed' },
      orderBy: { number: 'asc' },
      include: {
        responses: {
          select: { confidence: true, mood: true },
        },
      },
    })

    const waveStats = waves.map((w) => {
      const responseCount = w.responses.length
      const avgConfidence = responseCount > 0
        ? w.responses.reduce((sum, r) => sum + r.confidence, 0) / responseCount
        : 0

      // Mood encoding: enthusiastic=1, neutral=0.5, skeptical=0.25, concerned=0
      const moodScoreMap: Record<string, number> = {
        enthusiastic: 1,
        neutral: 0.5,
        skeptical: 0.25,
        concerned: 0,
      }
      const avgMood = responseCount > 0
        ? w.responses.reduce((sum, r) => sum + (moodScoreMap[r.mood] ?? 0.5), 0) / responseCount
        : 0.5

      return {
        waveNumber: w.number,
        type: w.type,
        responseCount,
        avgConfidence: Math.round(avgConfidence * 1000) / 1000,
        avgMood: Math.round(avgMood * 1000) / 1000,
        completedAt: w.completedAt,
      }
    })

    return NextResponse.json({ waveStats })
  } catch (error) {
    console.error('Wave stats error:', error)
    return NextResponse.json({ error: 'Error al obtener estadísticas de oleadas' }, { status: 500 })
  }
}
