import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  addMemory, getRelevantMemories, getProjectMemories,
  touchMemories, updateMemory, deleteMemory,
  consolidateMemories, garbageCollectMemories, getMemoryStats,
  extractAndStoreWaveMemories, scoreAndRank,
} from '@/lib/memory-store'

export const dynamic = 'force-dynamic'

// GET /api/nexus/memory-store?projectId=xxx&agentId=yyy&limit=10&category=all
// GET /api/nexus/memory-store?projectId=xxx&action=stats
// GET /api/nexus/memory-store?projectId=xxx&action=consolidate&agentId=yyy
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const projectId = searchParams.get('projectId')
    const action = searchParams.get('action')

    if (!projectId) {
      return NextResponse.json({ error: 'Se requiere projectId' }, { status: 400 })
    }

    if (action === 'stats') {
      const stats = await getMemoryStats(projectId)
      return NextResponse.json(stats)
    }

    if (action === 'consolidate') {
      const agentId = searchParams.get('agentId')
      if (!agentId) {
        return NextResponse.json({ error: 'Se requiere agentId para consolidación' }, { status: 400 })
      }
      const result = await consolidateMemories(projectId, agentId)
      return NextResponse.json(result)
    }

    if (action === 'gc') {
      const deleted = await garbageCollectMemories(projectId)
      return NextResponse.json({ deleted, message: `${deleted} memorias eliminadas por decay` })
    }

    const agentId = searchParams.get('agentId')
    const limit = parseInt(searchParams.get('limit') || '10', 10)
    const category = searchParams.get('category') || 'all'

    if (agentId) {
      const memories = await getRelevantMemories(projectId, agentId, limit, category)
      return NextResponse.json({ memories, total: memories.length, agentId })
    } else {
      const memories = await getProjectMemories(projectId, limit, category)
      return NextResponse.json({ memories, total: memories.length })
    }
  } catch (error) {
    console.error('Memory store GET failed:', error)
    return NextResponse.json({ error: 'Error al obtener memorias' }, { status: 500 })
  }
}

// POST /api/nexus/memory-store
// Body: { projectId, agentId, content, category?, tags?, baseScore?, sourceWaveId? }
export async function POST(request: NextRequest) {
  try {
    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
    }
    const { projectId, agentId, content, category, tags, baseScore, decayRate, sourceWaveId, sourceType } = body

    if (!projectId || !agentId || !content) {
      return NextResponse.json({ error: 'Se requieren projectId, agentId y content' }, { status: 400 })
    }

    const memory = await addMemory({
      projectId,
      agentId,
      content,
      category,
      tags,
      baseScore,
      decayRate,
      sourceWaveId,
      sourceType,
    })

    return NextResponse.json({ memory, success: true })
  } catch (error) {
    console.error('Memory store POST failed:', error)
    return NextResponse.json({ error: 'Error al almacenar memoria' }, { status: 500 })
  }
}

// PUT /api/nexus/memory-store?id=xxx
// Body: { content?, category?, tags?, baseScore?, decayRate? }
// Special: { action: "touch", ids: [...] }
export async function PUT(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const memoryId = searchParams.get('id')
    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
    }

    if (body.action === 'touch' && body.ids) {
      await touchMemories(body.ids)
      return NextResponse.json({ success: true, touched: body.ids.length })
    }

    if (!memoryId) {
      return NextResponse.json({ error: 'Se requiere ID de memoria (query param ?id=)' }, { status: 400 })
    }

    const { content, category, tags, baseScore, decayRate } = body
    const memory = await updateMemory(memoryId, {
      content,
      category,
      tags,
      baseScore,
      decayRate,
    })

    return NextResponse.json({ memory })
  } catch (error) {
    console.error('Memory store PUT failed:', error)
    return NextResponse.json({ error: 'Error al actualizar memoria' }, { status: 500 })
  }
}

// DELETE /api/nexus/memory-store?id=xxx
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const memoryId = searchParams.get('id')

    if (!memoryId) {
      return NextResponse.json({ error: 'Se requiere ID de memoria' }, { status: 400 })
    }

    await deleteMemory(memoryId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Memory store DELETE failed:', error)
    return NextResponse.json({ error: 'Error al eliminar memoria' }, { status: 500 })
  }
}
