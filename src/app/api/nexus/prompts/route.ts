import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/nexus/prompts?projectId=X&category=Y&page=1&limit=20&sort=newest|votes
export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get('projectId')
  const category = request.nextUrl.searchParams.get('category')
  const page = parseInt(request.nextUrl.searchParams.get('page') || '1', 10)
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20', 10)
  const sort = request.nextUrl.searchParams.get('sort') || 'newest'
  const status = request.nextUrl.searchParams.get('status') || 'active'

  if (!projectId) {
    return NextResponse.json({ error: 'Se requiere projectId' }, { status: 400 })
  }

  try {
    const where: Record<string, unknown> = { projectId, status }
    if (category && category !== 'all') {
      where.category = category
    }

    const orderBy = sort === 'votes'
      ? { votes: 'desc' as const }
      : { createdAt: 'desc' as const }

    const skip = (page - 1) * limit

    const [prompts, total] = await Promise.all([
      db.prompt.findMany({
        where,
        orderBy,
        skip,
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
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      db.prompt.count({ where }),
    ])

    return NextResponse.json({
      prompts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Prompts GET error:', error)
    return NextResponse.json({ error: 'Error al obtener prompts' }, { status: 500 })
  }
}

// POST /api/nexus/prompts — Create new prompt
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectId, title, content, authorAgent, authorType, tags, category } = body

    if (!projectId || !title || !content) {
      return NextResponse.json({ error: 'Se requieren projectId, title y content' }, { status: 400 })
    }

    // Check if project exists
    const project = await db.project.findUnique({ where: { id: projectId } })
    if (!project) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
    }

    const prompt = await db.prompt.create({
      data: {
        projectId,
        title: title.trim(),
        content: content.trim(),
        authorAgent: authorAgent || null,
        authorType: authorType || 'human',
        tags: Array.isArray(tags) ? tags.join(',') : (tags || ''),
        category: category || 'general',
      },
    })

    // Log the creation
    await db.systemLog.create({
      data: {
        projectId,
        type: 'prompt_created',
        message: `Prompt "${title.trim()}" creado por ${authorType || 'human'}${authorAgent ? ` (${authorAgent})` : ''}`,
        metadata: JSON.stringify({ promptId: prompt.id, category: category || 'general' }),
      },
    })

    return NextResponse.json({ prompt }, { status: 201 })
  } catch (error) {
    console.error('Prompts POST error:', error)
    return NextResponse.json({ error: 'Error al crear prompt' }, { status: 500 })
  }
}

// PUT /api/nexus/prompts — Update a prompt
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, title, content, tags, category, status } = body

    if (!id) {
      return NextResponse.json({ error: 'Se requiere id del prompt' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}
    if (title !== undefined) updateData.title = title.trim()
    if (content !== undefined) updateData.content = content.trim()
    if (tags !== undefined) updateData.tags = Array.isArray(tags) ? tags.join(',') : tags
    if (category !== undefined) updateData.category = category
    if (status !== undefined) updateData.status = status

    const prompt = await db.prompt.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ prompt })
  } catch (error) {
    console.error('Prompts PUT error:', error)
    return NextResponse.json({ error: 'Error al actualizar prompt' }, { status: 500 })
  }
}

// DELETE /api/nexus/prompts?id=X
export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Se requiere id' }, { status: 400 })
  }

  try {
    await db.prompt.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Prompts DELETE error:', error)
    return NextResponse.json({ error: 'Error al eliminar prompt' }, { status: 500 })
  }
}
