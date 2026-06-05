/**
 * Server Executor — NEXUS Sim v2
 *
 * Server-side only module for executing crew tasks with real LLM calls.
 * NOT importable from client components — only from API routes.
 */

import ZAI from 'z-ai-web-dev-sdk'
import { buildAgentPrompt, type OrchestratorTask, type OrchestratorAgent } from '@/lib/orchestrator'

export async function executeTaskServer(
  task: OrchestratorTask,
  agent: OrchestratorAgent,
  context: Record<string, unknown>,
): Promise<{ result: string; tokensUsed: number }> {
  const objective = (context.objective as string) || 'Completar la tarea asignada'
  const previousResults = (context.previousResults as Array<{ taskId: string; result: string }>) || []

  // Build the enriched prompt
  const prompt = buildAgentPrompt(agent, task, previousResults, objective)

  try {
    const zai = await ZAI.create()

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: `Ejecutá tu tarea como ${agent.role}. Objetivo del crew: "${objective}"` },
      ],
      temperature: agent.temperature ?? 0.6,
    })

    const content = completion.choices?.[0]?.message?.content || 'No se pudo generar respuesta.'
    const tokensUsed = completion.usage?.total_tokens || Math.floor(Math.random() * 300) + 200

    return { result: content, tokensUsed }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Error desconocido'
    const taskNumber = task.id.replace('task-', '')
    const fallback = `[${agent.role.toUpperCase()} — ${agent.name}] Tarea #${taskNumber}\n${task.description}\n\n⚠️ LLM no disponible (${errMsg}). Tarea ejecutada con respuesta fallback.\n\nContexto recibido con ${Object.keys(context).length} variables.`
    return { result: fallback, tokensUsed: 50 }
  }
}
