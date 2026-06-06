import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/nexus/prompts/gallery?projectId=X&category=Y&limit=10
// Returns top-voted prompts — a curated "gallery" view
export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get('projectId')
  const category = request.nextUrl.searchParams.get('category')
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '10', 10)

  if (!projectId) {
    return NextResponse.json({ error: 'Se requiere projectId' }, { status: 400 })
  }

  try {
    const where: Record<string, unknown> = {
      projectId,
      status: 'active',
      votes: { gt: 0 },
    }
    if (category && category !== 'all') {
      where.category = category
    }

    const [topPrompts, totalActive] = await Promise.all([
      db.prompt.findMany({
        where,
        orderBy: { votes: 'desc' },
        take: limit,
        select: {
          id: true,
          title: true,
          content: true,
          authorAgent: true,
          authorType: true,
          version: true,
          votes: true,
          tags: true,
          category: true,
          createdAt: true,
        },
      }),
      db.prompt.count({
        where: { projectId, status: 'active' },
      }),
    ])

    // Category distribution for stats
    const categoryDistribution = await db.prompt.groupBy({
      by: ['category'],
      where: { projectId, status: 'active' },
      _count: true,
    })

    return NextResponse.json({
      topPrompts,
      totalActive,
      categoryDistribution: categoryDistribution.map((c) => ({
        category: c.category,
        count: c._count,
      })),
    })
  } catch (error) {
    console.error('Gallery error:', error)
    return NextResponse.json({ error: 'Error al obtener galería' }, { status: 500 })
  }
}
