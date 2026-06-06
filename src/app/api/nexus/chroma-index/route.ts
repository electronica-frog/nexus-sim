import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { addToCollection, getCollectionCount, resetCollection } from '@/lib/chroma-store'

export const dynamic = 'force-dynamic'

/**
 * POST /api/nexus/chroma-index - Index all project data into ChromaDB
 * Fetches all memories and skills from SQLite, adds them to ChromaDB collections:
 *   - nexus-memories: id=memory.id, document=memory.content, metadata={agentId, type, importance, projectId, tags, createdAt}
 *   - nexus-skills: id=skill.id, document=skill.description, metadata={agentId, name, quality, timesUsed, projectId}
 */
export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const projectId = searchParams.get('projectId')
    const forceReset = searchParams.get('reset') === 'true'

    if (!projectId) {
      return NextResponse.json({ error: 'Se requiere projectId para indexar' }, { status: 400 })
    }

    // ===== INDEX MEMORIES =====
    const memoryWhere: Record<string, unknown> = projectId ? { projectId } : {}
    const memories = await db.agentMemory.findMany({
      where: memoryWhere,
      orderBy: { createdAt: 'desc' },
    })

    if (forceReset) {
      try { await resetCollection('nexus-memories') } catch { /* collection may not exist yet */ }
      try { await resetCollection('nexus-skills') } catch { /* collection may not exist yet */ }
    }

    let memoriesIndexed = 0
    const MEMORY_BATCH_SIZE = 100

    for (let i = 0; i < memories.length; i += MEMORY_BATCH_SIZE) {
      const batch = memories.slice(i, i + MEMORY_BATCH_SIZE)
      const ids = batch.map((m) => m.id)
      const documents = batch.map((m) => m.content)
      const metadatas = batch.map((m) => ({
        agentId: m.agentId,
        type: m.type,
        importance: m.importance,
        projectId: m.projectId,
        tags: m.tags,
        createdAt: m.createdAt.toISOString(),
      }))

      const result = await addToCollection('nexus-memories', ids, documents, metadatas)
      memoriesIndexed += result.count
    }

    // ===== INDEX SKILLS =====
    const skillWhere: Record<string, unknown> = projectId ? { projectId } : {}
    const skills = await db.agentSkill.findMany({
      where: skillWhere,
      orderBy: { quality: 'desc' },
    })

    let skillsIndexed = 0
    const SKILL_BATCH_SIZE = 100

    for (let i = 0; i < skills.length; i += SKILL_BATCH_SIZE) {
      const batch = skills.slice(i, i + SKILL_BATCH_SIZE)
      const ids = batch.map((s) => s.id)
      const documents = batch.map((s) => s.description)
      const metadatas = batch.map((s) => ({
        agentId: s.agentId,
        name: s.name,
        quality: s.quality,
        timesUsed: s.timesUsed,
        projectId: s.projectId,
      }))

      const result = await addToCollection('nexus-skills', ids, documents, metadatas)
      skillsIndexed += result.count
    }

    return NextResponse.json({
      success: true,
      memoriesIndexed,
      skillsIndexed,
      totalMemories: memories.length,
      totalSkills: skills.length,
    })
  } catch (error) {
    console.error('ChromaDB indexing error:', error)
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 },
    )
  }
}

/**
 * GET /api/nexus/chroma-index - Get index status
 * Returns document count in each ChromaDB collection.
 */
export async function GET() {
  try {
    const memoriesCount = await getCollectionCount('nexus-memories')
    const skillsCount = await getCollectionCount('nexus-skills')

    return NextResponse.json({
      status: 'ok',
      collections: {
        'nexus-memories': memoriesCount,
        'nexus-skills': skillsCount,
      },
      total: memoriesCount + skillsCount,
    })
  } catch (error) {
    console.error('ChromaDB status error:', error)
    return NextResponse.json(
      { status: 'error', error: String(error) },
      { status: 500 },
    )
  }
}
