import { NextRequest, NextResponse } from 'next/server'
import { executeTaskServer } from '@/lib/server-executor'
import { getExecutableTasks, type OrchestratorCrew } from '@/lib/orchestrator'
import { db } from '@/lib/db'
import { getEventBus } from '@/lib/event-bus'

export const dynamic = 'force-dynamic'

/**
 * POST /api/nexus/crew-execute
 * Execute a crew server-side with real LLM calls.
 * Body: { crew: OrchestratorCrew, projectId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { crew, projectId } = body as { crew: OrchestratorCrew; projectId: string }

    if (!crew || !projectId) {
      return NextResponse.json({ error: 'Se requieren crew y projectId' }, { status: 400 })
    }

    const updatedCrew = { ...crew, status: 'running' as const }
    const updatedTasks = [...updatedCrew.tasks]
    const results: Array<{ taskId: string; result: string }> = []
    const log: string[] = []
    let turn = 0
    let totalTokens = 0

    while (turn < crew.maxTurns) {
      const executable = getExecutableTasks(updatedCrew)
      if (executable.length === 0) break

      for (const task of executable) {
        const taskIdx = updatedTasks.findIndex((t) => t.id === task.id)
        if (taskIdx === -1) continue

        const agent = updatedCrew.agents.find((a) => a.role === task.assigneeRole) || updatedCrew.agents[0]
        log.push(`🔄 ${agent.name} (${agent.role}) ejecutando: ${task.description.slice(0, 60)}...`)

        const execResult = await executeTaskServer(task, agent, {
          ...crew.context,
          previousResults: results,
        })
        totalTokens += execResult.tokensUsed

        updatedTasks[taskIdx] = {
          ...task,
          status: 'completed',
          result: execResult.result,
          tokensUsed: execResult.tokensUsed,
          startedAt: new Date(Date.now() - 3000).toISOString(),
          completedAt: new Date().toISOString(),
        }
        results.push({ taskId: task.id, result: execResult.result })
        log.push(`✅ ${agent.name} completó tarea ${task.id} (${execResult.tokensUsed} tokens)`)

        // Emit SSE event for real-time updates
        try {
          getEventBus().emit(projectId, 'crew_task_completed', {
            crewId: crew.id,
            taskId: task.id,
            agentName: agent.name,
            agentRole: agent.role,
            tokensUsed: execResult.tokensUsed,
          })
        } catch {
          // SSE not available
        }
      }

      turn++
    }

    const completedCrew = {
      ...updatedCrew,
      tasks: updatedTasks,
      status: 'completed' as const,
      completedAt: new Date().toISOString(),
    }

    log.push(`🎉 Crew "${crew.name}" completado en ${turn} turnos (${totalTokens} tokens total)`)

    // Log to system
    try {
      await db.systemLog.create({
        data: {
          projectId,
          type: 'crew_completed',
          message: `Crew "${crew.name}" completado: ${turn} turnos, ${totalTokens} tokens, ${updatedTasks.length} tareas`,
          metadata: JSON.stringify({
            crewId: crew.id,
            strategy: crew.strategy,
            turns: turn,
            totalTokens,
            taskCount: updatedTasks.length,
            completedTasks: updatedTasks.filter(t => t.status === 'completed').length,
          }),
        },
      })
    } catch {
      // DB not available
    }

    // Emit completion event
    try {
      getEventBus().emit(projectId, 'crew_completed', {
        crewId: crew.id,
        crewName: crew.name,
        turns: turn,
        totalTokens,
      })
    } catch {
      // SSE not available
    }

    return NextResponse.json({
      success: true,
      crew: completedCrew,
      log,
      totalTokens,
      turns: turn,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno'
    console.error('[Crew Execute API] Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
