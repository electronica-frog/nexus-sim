import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const revalidate = 30 // Cache dashboard for 30s (stale-while-revalidate)

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
      completedWaves,
      recentLogs,
    ] = await Promise.all([
      // Agent list (no includes)
      db.projectAgent.findMany({ where: { projectId } }),
      // All waves (no includes)
      db.wave.findMany({ where: { projectId } }),
      // Memory count
      db.agentMemory.findMany({ where: { projectId }, select: { id: true } }),
      // Skills count
      db.agentSkill.findMany({ where: { projectId }, select: { id: true } }),
      // Specs count
      db.spec.findMany({ where: { projectId }, select: { id: true } }),
      // Proposals count
      db.proposal.findMany({ where: { projectId }, select: { id: true } }),
      // Response confidence values (for average)
      db.response.findMany({
        where: { wave: { projectId } },
        select: { confidence: true },
      }),
      // Last wave timestamp
      db.wave.findFirst({
        where: { projectId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
      // Project uptime
      db.project.findUnique({
        where: { id: projectId },
        select: { createdAt: true },
      }),
      // Completed waves with responses (for wave stats)
      db.wave.findMany({
        where: { projectId, status: 'completed' },
        orderBy: { number: 'asc' },
        include: {
          responses: {
            select: { confidence: true, mood: true },
          },
        },
      }),
      // Recent system logs (last 20)
      db.systemLog.findMany({
        where: { projectId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ])

    // === System Health ===
    const totalAgents = agents.length
    const activeAgents = agents.filter((a) => a.status === 'thinking').length
    const idleAgents = agents.filter((a) => a.status === 'idle').length
    const failedAgents = agents.filter((a) => a.status === 'failed').length

    const totalWaves = waves.length
    const completedWavesCount = waves.filter((w) => w.status === 'completed').length
    const failedWavesCount = waves.filter((w) => w.status === 'failed').length

    const totalMemories = memories.length
    const totalSkills = skills.length
    const totalSpecs = specs.length
    const totalProposals = proposals.length

    const averageTrust = agents.length > 0
      ? agents.reduce((sum, a) => sum + (a.trustScore ?? 0.5), 0) / agents.length
      : 0

    const averageConfidence = responses.length > 0
      ? responses.reduce((sum, r) => sum + r.confidence, 0) / responses.length
      : 0

    // Wave type distribution
    const waveTypeDistribution: Record<string, number> = {}
    for (const w of waves) {
      waveTypeDistribution[w.type] = (waveTypeDistribution[w.type] || 0) + 1
    }

    // Division activity — lightweight: batch fetch PA→division + response→PA mapping
    const divisionActivity: Record<string, number> = {}
    const paWithDiv = await db.projectAgent.findMany({
      where: { projectId },
      select: { id: true, agent: { select: { division: true } } },
    })
    const paDivMap = new Map(paWithDiv.map((pa) => [pa.id, pa.agent.division]))
    const divResponses = await db.response.findMany({
      where: { wave: { projectId } },
      select: { agentId: true },
    })
    for (const dr of divResponses) {
      const div = paDivMap.get(dr.agentId) || 'unknown'
      divisionActivity[div] = (divisionActivity[div] || 0) + 1
    }

    // === Wave Stats ===
    const waveStats = completedWaves.map((w) => {
      const responseCount = w.responses.length
      const avgConf = responseCount > 0
        ? w.responses.reduce((sum, r) => sum + r.confidence, 0) / responseCount
        : 0

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
        avgConfidence: Math.round(avgConf * 1000) / 1000,
        avgMood: Math.round(avgMood * 1000) / 1000,
        completedAt: w.completedAt,
      }
    })

    return NextResponse.json({
      // System health
      totalAgents,
      activeAgents,
      idleAgents,
      failedAgents,
      totalWaves,
      completedWaves: completedWavesCount,
      failedWaves: failedWavesCount,
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
      // Wave stats
      waveStats,
      // Recent activity logs (last 20)
      activityLogs: recentLogs,
      // Counts for badges
      skillsCount: totalSkills,
      sharedLearningsCount: totalMemories,
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json({ error: 'Error al cargar el dashboard' }, { status: 500 })
  }
}
