import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get('projectId')

  if (!projectId) {
    return NextResponse.json({ error: 'Se requiere projectId' }, { status: 400 })
  }

  try {
    // Run all queries in parallel for efficiency
    const [
      agents,
      waves,
      memories,
      skills,
      specs,
      proposals,
      responses,
      lastWave,
      project,
    ] = await Promise.all([
      db.projectAgent.findMany({ where: { projectId } }),
      db.wave.findMany({ where: { projectId } }),
      db.agentMemory.findMany({ where: { projectId }, select: { id: true } }),
      db.agentSkill.findMany({ where: { projectId }, select: { id: true } }),
      db.spec.findMany({ where: { projectId }, select: { id: true } }),
      db.proposal.findMany({ where: { projectId }, select: { id: true } }),
      db.response.findMany({
        where: { wave: { projectId } },
        select: { confidence: true },
      }),
      db.wave.findFirst({
        where: { projectId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
      db.project.findUnique({
        where: { id: projectId },
        select: { createdAt: true },
      }),
    ])

    // Agent status counts
    const totalAgents = agents.length
    const activeAgents = agents.filter((a) => a.status === 'thinking').length
    const idleAgents = agents.filter((a) => a.status === 'idle').length
    const failedAgents = agents.filter((a) => a.status === 'failed').length

    // Wave status counts
    const totalWaves = waves.length
    const completedWaves = waves.filter((w) => w.status === 'completed').length
    const failedWaves = waves.filter((w) => w.status === 'failed').length

    // Aggregate counts
    const totalMemories = memories.length
    const totalSkills = skills.length
    const totalSpecs = specs.length
    const totalProposals = proposals.length

    // Average trust score from agents
    const averageTrust = agents.length > 0
      ? agents.reduce((sum, a) => sum + (a.trustScore ?? 0.5), 0) / agents.length
      : 0

    // Average confidence from all responses
    const averageConfidence = responses.length > 0
      ? responses.reduce((sum, r) => sum + r.confidence, 0) / responses.length
      : 0

    // Wave type distribution
    const waveTypeDistribution: Record<string, number> = {}
    for (const w of waves) {
      waveTypeDistribution[w.type] = (waveTypeDistribution[w.type] || 0) + 1
    }

    // Division activity: count responses per division
    const agentIds = agents.map((a) => a.id)
    const responsesWithAgent = await db.response.findMany({
      where: {
        wave: { projectId },
        agentId: { in: agentIds },
      },
      include: {
        projectAgent: {
          include: { agent: { select: { division: true } } },
        },
      },
    })
    const divisionActivity: Record<string, number> = {}
    for (const r of responsesWithAgent) {
      const div = r.projectAgent?.agent?.division || 'unknown'
      divisionActivity[div] = (divisionActivity[div] || 0) + 1
    }

    return NextResponse.json({
      totalAgents,
      activeAgents,
      idleAgents,
      failedAgents,
      totalWaves,
      completedWaves,
      failedWaves,
      totalMemories,
      totalSkills,
      totalSpecs,
      totalProposals,
      averageTrust: Math.round(averageTrust * 1000) / 1000,
      averageConfidence: Math.round(averageConfidence * 1000) / 1000,
      lastWaveAt: lastWave?.createdAt || null,
      systemUptime: project?.createdAt || null,
      waveTypeDistribution,
      divisionActivity,
    })
  } catch (error) {
    console.error('System health error:', error)
    return NextResponse.json({ error: 'Error al calcular salud del sistema' }, { status: 500 })
  }
}
