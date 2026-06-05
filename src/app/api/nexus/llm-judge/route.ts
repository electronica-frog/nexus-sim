import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { evaluateWave, calculateTrustFromJudge } from '@/lib/llm-judge'

export const dynamic = 'force-dynamic'

// POST /api/nexus/llm-judge — Evaluate a completed wave with LLM Judge
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { waveId, projectId } = body

    if (!waveId || !projectId) {
      return NextResponse.json({ error: 'Se requieren waveId y projectId' }, { status: 400 })
    }

    // Fetch wave with responses and agent data
    const wave = await db.wave.findUnique({
      where: { id: waveId },
      include: {
        responses: {
          include: {
            projectAgent: {
              include: { agent: { select: { name: true, division: true, emoji: true } } },
            },
          },
        },
      },
    })

    if (!wave) {
      return NextResponse.json({ error: 'Oleada no encontrada' }, { status: 404 })
    }

    if (wave.projectId !== projectId) {
      return NextResponse.json({ error: 'La oleada no pertenece al proyecto' }, { status: 400 })
    }

    // Build evaluation data
    const evaluationData = {
      projectId,
      waveId: wave.id,
      waveNumber: wave.number,
      waveType: wave.type,
      prompt: wave.prompt,
      responses: wave.responses.map((r) => ({
        agentName: r.projectAgent.agent.name,
        agentId: r.projectAgent.agentId,
        division: r.projectAgent.agent.division,
        content: r.content,
        confidence: r.confidence,
        mood: r.mood,
      })),
      result: wave.result || undefined,
    }

    // Run the judge evaluation
    const judgeResult = await evaluateWave(evaluationData)

    // Calculate trust adjustments based on judge
    const trustAdjustments = calculateTrustFromJudge(
      judgeResult,
      evaluationData.responses.map((r) => ({ agentId: r.agentId, agentName: r.agentName })),
    )

    // Apply trust adjustments to database
    for (const adj of trustAdjustments) {
      const pa = await db.projectAgent.findFirst({
        where: { agentId: adj.agentId, projectId },
      })
      if (pa) {
        const newTrust = Math.max(0, Math.min(1, (pa.trustScore ?? 0.5) + adj.delta))
        await db.projectAgent.update({
          where: { id: pa.id },
          data: { trustScore: newTrust },
        })
      }
    }

    // Log the evaluation
    await db.systemLog.create({
      data: {
        projectId,
        type: 'judge_evaluation',
        message: `Juez evaluó oleada #${wave.number} (${wave.type}): score=${judgeResult.overallScore.toFixed(2)}, tokens=${judgeResult.tokensUsed}`,
        metadata: JSON.stringify({
          waveId: wave.id,
          waveNumber: wave.number,
          overallScore: judgeResult.overallScore,
          dimensions: judgeResult.dimensions.map((d) => ({ name: d.name, score: d.score })),
          highlights: judgeResult.highlights,
          trustAdjustments: trustAdjustments.map((t) => ({ agentId: t.agentId, delta: t.delta, reason: t.reason })),
          tokensUsed: judgeResult.tokensUsed,
        }),
      },
    })

    return NextResponse.json({
      success: true,
      evaluation: judgeResult,
      trustAdjustments,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno'
    console.error('[LLM Judge API] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// GET /api/nexus/llm-judge?projectId=xxx — Get evaluation history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json({ error: 'Se requiere projectId' }, { status: 400 })
    }

    // Get judge evaluation logs
    const logs = await db.systemLog.findMany({
      where: {
        projectId,
        type: 'judge_evaluation',
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    const evaluations = logs.map((log) => {
      try {
        const meta = JSON.parse(log.metadata)
        return {
          id: log.id,
          waveId: meta.waveId,
          waveNumber: meta.waveNumber,
          overallScore: meta.overallScore,
          dimensions: meta.dimensions,
          highlights: meta.highlights,
          tokensUsed: meta.tokensUsed,
          trustAdjustments: meta.trustAdjustments,
          evaluatedAt: log.createdAt,
        }
      } catch {
        return {
          id: log.id,
          message: log.message,
          evaluatedAt: log.createdAt,
        }
      }
    })

    return NextResponse.json({ evaluations })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
