import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/nexus/cross-project?sourceId=xxx&targetId=xxx&limit=20
 * Get learnings from a source project that could be transferred to a target project.
 * Cross-project knowledge transfer: shared skills, patterns, and insights.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sourceId = searchParams.get('sourceId')
    const targetId = searchParams.get('targetId')
    const limit = parseInt(searchParams.get('limit') || '20')

    if (!sourceId || !targetId) {
      return NextResponse.json({ error: 'Se requieren sourceId y targetId' }, { status: 400 })
    }

    if (sourceId === targetId) {
      return NextResponse.json({ error: 'sourceId y targetId deben ser diferentes' }, { status: 400 })
    }

    // Get top skills from source project
    const sourceSkills = await db.agentSkill.findMany({
      where: { projectId: sourceId, quality: { gte: 0.6 } },
      include: { project: { select: { name: true } } },
      orderBy: { quality: 'desc' },
      take: limit,
    })

    // Get top memories from source project
    const sourceMemories = await db.agentMemory.findMany({
      where: { projectId: sourceId, importance: { gte: 0.6 }, type: { in: ['learning', 'pattern'] } },
      orderBy: { importance: 'desc' },
      take: limit,
    })

    // Get Mem0 long-term memories from source
    const sourceMem0 = await db.memoryStore.findMany({
      where: {
        projectId: sourceId,
        category: { in: ['insight', 'pattern', 'skill'] },
      },
      orderBy: { baseScore: 'desc' },
      take: limit,
    })

    // Get agents in target project (for matching)
    const targetAgents = await db.projectAgent.findMany({
      where: { projectId: targetId },
      select: { agentId: true, agent: { select: { name: true, division: true } } },
    })
    const targetAgentIds = new Set(targetAgents.map(pa => pa.agentId))

    // Check what already exists in target
    const existingSkills = await db.agentSkill.findMany({
      where: { projectId: targetId },
      select: { name: true, agentId: true },
    })
    const existingSkillSet = new Set(existingSkills.map(s => `${s.agentId}:${s.name}`))

    // Build transferable items
    const transferableSkills = sourceSkills
      .filter(s => !existingSkillSet.has(`${s.agentId}:${s.name}`))
      .map(s => ({
        type: 'skill',
        name: s.name,
        description: s.description,
        quality: s.quality,
        timesUsed: s.timesUsed,
        agentId: s.agentId,
        existsInTarget: targetAgentIds.has(s.agentId),
        sourceProject: sourceSkills[0]?.project?.name || 'Unknown',
      }))

    const transferableMemories = sourceMemories.map(m => ({
      type: 'memory',
      content: m.content.slice(0, 200),
      typeDetail: m.type,
      importance: m.importance,
      agentId: m.agentId,
      tags: m.tags,
      existsInTarget: targetAgentIds.has(m.agentId),
    }))

    const transferableMem0 = sourceMem0.map(m => ({
      type: 'mem0',
      content: m.content.slice(0, 200),
      category: m.category,
      baseScore: m.baseScore,
      accessCount: m.accessCount,
      agentId: m.agentId,
      existsInTarget: targetAgentIds.has(m.agentId),
    }))

    return NextResponse.json({
      sourceProject: sourceId,
      targetProject: targetId,
      transferable: {
        skills: transferableSkills,
        memories: transferableMemories,
        mem0: transferableMem0,
      },
      summary: {
        totalSkills: transferableSkills.length,
        totalMemories: transferableMemories.length,
        totalMem0: transferableMem0.length,
        agentsInBoth: sourceSkills.filter(s => targetAgentIds.has(s.agentId)).length,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * POST /api/nexus/cross-project
 * Transfer learnings from source to target project.
 * Body: { sourceId, targetId, items: [{ type, agentId, name?, content? }] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sourceId, targetId, items } = body as {
      sourceId: string
      targetId: string
      items: Array<{ type: 'skill' | 'memory' | 'mem0'; agentId: string; name?: string; description?: string; content?: string; category?: string; baseScore?: number }>
    }

    if (!sourceId || !targetId || !items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Se requieren sourceId, targetId e items' }, { status: 400 })
    }

    let skillsTransferred = 0
    let memoriesTransferred = 0
    let mem0Transferred = 0

    for (const item of items) {
      // Only transfer to agents that exist in target
      const existsInTarget = await db.projectAgent.findFirst({
        where: { projectId: targetId, agentId: item.agentId },
      })
      if (!existsInTarget) continue

      if (item.type === 'skill' && item.name) {
        // Check if skill already exists
        const existing = await db.agentSkill.findFirst({
          where: { projectId: targetId, agentId: item.agentId, name: item.name },
        })
        if (!existing) {
          await db.agentSkill.create({
            data: {
              projectId: targetId,
              agentId: item.agentId,
              name: item.name,
              description: item.description || `Transferido de proyecto fuente`,
              quality: 0.5, // Start at neutral, let the system adjust
              sourceType: 'wave', // Mark as transferred
            },
          })
          skillsTransferred++
        }
      }

      if (item.type === 'memory' && item.content) {
        await db.agentMemory.create({
          data: {
            projectId: targetId,
            agentId: item.agentId,
            type: 'learning',
            content: `[Cross-Project] ${item.content}`,
            tags: 'cross-project,transferred',
            importance: item.baseScore ? Math.min(1, item.baseScore * 0.8) : 0.5,
          },
        })
        memoriesTransferred++
      }

      if (item.type === 'mem0' && item.content) {
        await db.memoryStore.create({
          data: {
            projectId: targetId,
            agentId: item.agentId,
            content: `[Cross-Project] ${item.content}`,
            category: item.category || 'insight',
            baseScore: item.baseScore ? Math.min(2, item.baseScore * 0.7) : 0.8,
            sourceType: 'consolidation',
            tags: 'cross-project',
          },
        })
        mem0Transferred++
      }
    }

    // Log the transfer
    await db.systemLog.create({
      data: {
        projectId: targetId,
        type: 'cross_project_transfer',
        message: `Transferencia cross-proyecto: ${skillsTransferred} skills, ${memoriesTransferred} memories, ${mem0Transferred} mem0 desde ${sourceId}`,
        metadata: JSON.stringify({ sourceId, skillsTransferred, memoriesTransferred, mem0Transferred, totalItems: items.length }),
      },
    })

    return NextResponse.json({
      success: true,
      transferred: { skills: skillsTransferred, memories: memoriesTransferred, mem0: mem0Transferred },
      total: skillsTransferred + memoriesTransferred + mem0Transferred,
      skipped: items.length - (skillsTransferred + memoriesTransferred + mem0Transferred),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
