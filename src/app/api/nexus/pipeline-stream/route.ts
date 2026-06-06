import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { VALID_WAVE_TYPES, DIVISION_MAP } from '@/lib/nexus-wave'

export const dynamic = 'force-dynamic'
export const maxDuration = 600 // 10 minutes for 5-step pipeline

function sseEvent(event: string, data: object): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

interface AgentWithProject {
  id: string
  agentId: string
  projectId: string
  agent: {
    id: string; agentId: string; name: string; division: string;
    emoji: string; color: string; vibe: string; personality: string; tools: string;
  }
}

async function runSingleWave(
  controller: TransformStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  projectId: string,
  type: string,
  prompt: string,
  extraContext?: string,
  specificAgentIds?: string[],
): Promise<{ synthesis: string | null; responses: Array<{ content: string; agentName: string }> }> {
  // Dynamic imports — loaded on demand, not at module evaluation
  const { callLLM } = await import('@/lib/nexus-wave')
  const { updateTrustAfterWave } = await import('@/lib/trust')
  const { buildMemoryContent, buildMemoryTags, calculateImportance, formatSharedLearnings } = await import('@/lib/semantic-memory')
  const { getAgentSkills, formatAgentSkills, markSkillsAsUsed, boostSkillQuality, extractSkillsFromWave } = await import('@/lib/skills')
  const { addLog } = await import('@/lib/system-logs')
  const { computeTFIDFVector, vectorToJson } = await import('@/lib/vector-search')
  const { emitWaveStarted, emitWaveAgentResponding, emitWaveCompleted } = await import('@/lib/event-bus')

  let projectAgents: AgentWithProject[] = []

  if (specificAgentIds && specificAgentIds.length > 0) {
    projectAgents = await db.projectAgent.findMany({
      where: { projectId, id: { in: specificAgentIds } },
      include: { agent: { select: { id: true, agentId: true, name: true, division: true, emoji: true, color: true, vibe: true, personality: true } } },
    }) as AgentWithProject[]
  } else {
    const divisions = DIVISION_MAP[type] || []
    // Step 1: lightweight query for filtering
    const allProjectAgents = await db.projectAgent.findMany({
      where: { projectId },
      include: { agent: { select: { id: true, agentId: true, name: true, division: true, emoji: true } } },
    })
    let filtered: typeof allProjectAgents
    if (type === 'quality_gate') {
      filtered = allProjectAgents.filter(
        (pa) =>
          pa.agent.agentId.includes('reality-checker') ||
          pa.agent.agentId.includes('evidence-collector'),
      ) as AgentWithProject[]
    } else {
      filtered = allProjectAgents.filter((pa) => divisions.includes(pa.agent.division)) as AgentWithProject[]
    }
    if (filtered.length > 8) filtered = filtered.slice(0, 8) as AgentWithProject[]
    // Step 2: fetch full data only for filtered agents
    const filteredIds = filtered.map((pa) => pa.id)
    projectAgents = await db.projectAgent.findMany({
      where: { projectId, id: { in: filteredIds } },
      include: { agent: { select: { id: true, agentId: true, name: true, division: true, emoji: true, color: true, vibe: true, personality: true } } },
    }) as AgentWithProject[]
  }

  if (projectAgents.length === 0) return { synthesis: null, responses: [] }

  const lastWave = await db.wave.findFirst({
    where: { projectId },
    orderBy: { number: 'desc' },
  })
  const waveNumber = (lastWave?.number || 0) + 1

  const wave = await db.wave.create({
    data: { projectId, number: waveNumber, type, status: 'running', prompt: extraContext ? `${prompt}\n\n[Contexto adicional de la oleada anterior]:\n${extraContext}` : prompt },
  })

  await addLog(projectId, 'wave_created', `Pipeline — Oleada #${waveNumber} (${type}) creada`, { waveId: wave.id, waveNumber, type, isPipeline: true })

  for (const pa of projectAgents) {
    await db.projectAgent.update({
      where: { id: pa.id },
      data: { status: 'thinking', waveNumber },
    })
  }

  const previousWaves = await db.wave.findMany({
    where: { projectId, id: { not: wave.id } },
    include: { responses: { include: { projectAgent: { include: { agent: { select: { id: true, agentId: true, name: true, division: true, emoji: true } } } } } } },
    orderBy: { number: 'desc' },
    take: 3,
  })

  const previousResponses = previousWaves.flatMap((w) =>
    w.responses.map((r) => `[${r.projectAgent.agent.name}]: ${r.content.slice(0, 200)}`),
  )

  // Fetch shared learnings for semantic memory (mutual teaching)
  const sharedLearningsRaw = await db.agentMemory.findMany({
    where: { projectId, importance: { gt: 0.6 } },
    orderBy: { importance: 'desc' },
    take: 10,
  })
  // Batch fetch agent info for shared learnings (fix N+1)
  const sharedAgentIds = [...new Set(sharedLearningsRaw.slice(0, 8).map(m => m.agentId))]
  const sharedAgentsMap = new Map<string, { name: string; emoji: string; division: string }>()
  if (sharedAgentIds.length > 0) {
    const sharedAgents = await db.agent.findMany({
      where: { id: { in: sharedAgentIds } },
      select: { id: true, name: true, emoji: true, division: true },
    })
    for (const a of sharedAgents) sharedAgentsMap.set(a.id, a)
  }

  const sharedLearningsAgents = sharedLearningsRaw.slice(0, 8).map(m => {
    const agent = sharedAgentsMap.get(m.agentId)
    const tagsArr = m.tags.split(',')
    const waveType = tagsArr.find((t) => ['brainstorm', 'critique', 'synthesize', 'execute', 'quality_gate'].includes(t)) || 'unknown'
    return {
      agentName: agent?.name || 'Desconocido',
      agentEmoji: agent?.emoji || '🤖',
      content: m.content,
      waveType,
      importance: m.importance,
    }
  })
  const sharedLearningsStr = formatSharedLearnings(sharedLearningsAgents)

  // Pre-fetch all agent skills (batch) for Auto-Mejora
  const allAgentSkills = await db.agentSkill.findMany({
    where: { projectId },
    orderBy: [{ quality: 'desc' }, { timesUsed: 'desc' }],
  })

  const allResponses: Array<{ content: string; agentName: string }> = []

  for (let i = 0; i < projectAgents.length; i++) {
    const pa = projectAgents[i]

    controller.enqueue(encoder.encode(sseEvent('agent_start', {
      agentId: pa.id,
      agentName: pa.agent.name,
      emoji: pa.agent.emoji,
      division: pa.agent.division,
      index: i,
      total: projectAgents.length,
      pipelineStep: type,
    })))

    try {
      const memories = await db.agentMemory.findMany({
        where: { projectId, agentId: pa.agentId },
        orderBy: { importance: 'desc' },
        take: 5,
      })
      const memoryStrings = memories.map((m) => `[${m.type}]: ${m.content}`)

      // Fetch agent's learned skills (Auto-Mejora)
      const agentSkills = allAgentSkills.filter((s) => s.agentId === pa.agentId).slice(0, 5)
      const agentSkillsStr = formatAgentSkills(agentSkills)
      if (agentSkills.length > 0) {
        await markSkillsAsUsed(agentSkills.map((s) => s.id)).catch(() => {})
      }

      const fullPrompt = extraContext
        ? `${prompt}\n\n[Contexto de oleadas anteriores del pipeline]:\n${extraContext}`
        : prompt

      // Emit broadcast event: agent responding in pipeline
      emitWaveAgentResponding({ waveId: '', agentName: pa.agent.name, agentEmoji: pa.agent.emoji, projectId })

      const llmData = await callLLM({
        agentName: pa.agent.name,
        agentPersonality: pa.agent.personality.slice(0, 2000),
        waveType: type,
        prompt: fullPrompt,
        memories: memoryStrings,
        previousResponses,
        sharedLearnings: sharedLearningsStr,
        agentSkills: agentSkillsStr,
        agentEmoji: pa.agent.emoji,
        agentVibe: pa.agent.vibe,
      })

      await db.response.create({
        data: {
          waveId: wave.id,
          agentId: pa.id,
          content: llmData.content,
          confidence: llmData.confidence,
          mood: llmData.mood,
        },
      })

      // Boost skill quality (Auto-Mejora)
      await boostSkillQuality(projectId, pa.agentId, llmData.confidence, llmData.mood).catch(() => {})

      // Enhanced semantic memory — captures actual insight
      const memoryContent = buildMemoryContent({
        waveType: `pipeline-${type}`,
        waveNumber,
        confidence: llmData.confidence,
        mood: llmData.mood,
        responseContent: llmData.content,
        prompt,
      })
      await db.agentMemory.create({
        data: {
          projectId,
          agentId: pa.agentId,
          type: 'learning',
          content: memoryContent,
          tags: buildMemoryTags({
            waveType: type,
            waveNumber,
            mood: llmData.mood,
            prompt,
          }) + ',pipeline',
          importance: calculateImportance({
            confidence: llmData.confidence,
            mood: llmData.mood,
            responseLength: llmData.content.length,
          }),
          embedding: JSON.stringify(vectorToJson(computeTFIDFVector(memoryContent))),
        },
      })

      await db.projectAgent.update({
        where: { id: pa.id },
        data: { status: 'done' },
      })

      allResponses.push({ content: llmData.content, agentName: pa.agent.name })

      controller.enqueue(encoder.encode(sseEvent('agent_response', {
        agentId: pa.id,
        content: llmData.content,
        confidence: llmData.confidence,
        mood: llmData.mood,
        agentName: pa.agent.name,
        emoji: pa.agent.emoji,
        division: pa.agent.division,
        pipelineStep: type,
      })))

      controller.enqueue(encoder.encode(sseEvent('agent_done', {
        agentId: pa.id,
        status: 'done',
      })))
    } catch (error) {
      console.error(`Pipeline error for agent ${pa.agent.name}:`, error)
      await db.projectAgent.update({
        where: { id: pa.id },
        data: { status: 'failed' },
      })
      allResponses.push({ content: `Error: ${String(error)}`, agentName: pa.agent.name })

      controller.enqueue(encoder.encode(sseEvent('agent_response', {
        agentId: pa.id,
        content: `Error: ${String(error)}`,
        confidence: 0,
        mood: 'concerned',
        agentName: pa.agent.name,
        emoji: pa.agent.emoji,
        division: pa.agent.division,
        pipelineStep: type,
      })))
      controller.enqueue(encoder.encode(sseEvent('agent_done', {
        agentId: pa.id,
        status: 'failed',
      })))
    }
  }

  if (type === 'critique') {
    const concerns = allResponses.filter((r) => r.content.includes('preocupación') || r.content.includes('riesgo'))
    if (concerns.length > 0) {
      await db.proposal.create({
        data: {
          projectId,
          waveId: wave.id,
          title: `Propuesta de mejora (Pipeline) - Oleada #${waveNumber}`,
          description: `Se identificaron ${concerns.length} preocupaciones en el pipeline de crítica.`,
          type: 'enhancement',
          priority: concerns.length > 3 ? 'high' : 'medium',
          status: 'proposed',
        },
      })
    }
  }

  // Extract skills from high-quality responses (Auto-Mejora)
  try {
    const extractedCount = await extractSkillsFromWave(wave.id, projectId)
    if (extractedCount > 0) {
      await addLog(projectId, 'skill_learned', `Pipeline — ${extractedCount} habilidades extraídas en paso ${type}`, { type, count: extractedCount })
    }
  } catch (skillErr) {
    console.error('Pipeline skill extraction error (non-blocking):', skillErr)
  }

  // Update trust scores for all agents that responded
  await updateTrustAfterWave(wave.id, projectId)

  const synthesis = allResponses.map((r) => `[${r.agentName}]: ${r.content}`).join('\n\n')

  await addLog(projectId, 'wave_completed', `Pipeline — Paso ${type} completado con ${allResponses.length} respuestas`, { type, responseCount: allResponses.length })

  await db.wave.update({
    where: { id: wave.id },
    data: { status: 'completed', completedAt: new Date(), result: synthesis },
  })

  return { synthesis, responses: allResponses, waveId: wave.id }
}

export async function POST(request: NextRequest) {
  let body
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: 'JSON inválido' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    })
  }
  const { projectId, prompt, selectedAgentIds } = body

  if (!projectId || !prompt) {
    return new Response(JSON.stringify({ error: 'Faltan campos requeridos: projectId, prompt' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    })
  }

  if (typeof prompt === 'string' && prompt.length > 10000) {
    return new Response(JSON.stringify({ error: 'El prompt es demasiado largo (máximo 10,000 caracteres)' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    })
  }

  if (selectedAgentIds && !Array.isArray(selectedAgentIds)) {
    return new Response(JSON.stringify({ error: 'selectedAgentIds debe ser un array' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    })
  }

  if (selectedAgentIds && selectedAgentIds.length > 20) {
    return new Response(JSON.stringify({ error: 'Máximo 20 agentes por oleada' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    })
  }

  const encoder = new TextEncoder()
  const steps = ['brainstorm', 'critique', 'synthesize', 'execute', 'quality_gate'] as const
  const stepLabels: Record<string, string> = {
    brainstorm: 'Paso 1/5: Lluvia de Ideas',
    critique: 'Paso 2/5: Crítica y Evaluación',
    synthesize: 'Paso 3/5: Síntesis Integradora',
    execute: 'Paso 4/5: Plan de Ejecución',
    quality_gate: 'Paso 5/5: Control de Calidad',
  }

  const stream = new ReadableStream({
    async start(controller) {
      // Dynamic imports — loaded on demand, not at module evaluation
      const { addLog } = await import('@/lib/system-logs')
      const { emitPipelineStarted, emitPipelineStepCompleted, emitPipelineCompleted } = await import('@/lib/event-bus')

  try {
        controller.enqueue(encoder.encode(sseEvent('pipeline_start', {
          totalSteps: 5,
          prompt,
        })))

        await addLog(projectId, 'pipeline_started', 'Pipeline de 5 pasos iniciado', { prompt: prompt.slice(0, 100) })

        // Emit broadcast event for multi-user collaboration
        emitPipelineStarted({ steps: [...steps], projectId })

        let previousSynthesis: string | null = null
        let allResponsesCount = 0

        for (let stepIdx = 0; stepIdx < steps.length; stepIdx++) {
          const type = steps[stepIdx]

          controller.enqueue(encoder.encode(sseEvent('pipeline_step', {
            step: stepIdx + 1,
            totalSteps: 5,
            type,
            label: stepLabels[type],
          })))

          const { synthesis, responses } = await runSingleWave(
            controller, encoder, projectId, type, prompt, previousSynthesis || undefined,
          )

          allResponsesCount += responses.length
          previousSynthesis = synthesis

          controller.enqueue(encoder.encode(sseEvent('pipeline_step_complete', {
            step: stepIdx + 1,
            type,
            responsesCount: responses.length,
          })))

          // Emit broadcast event: pipeline step completed
          emitPipelineStepCompleted({ step: type, stepIndex: stepIdx, projectId })
        }

        // Generate executive summary
        await addLog(projectId, 'pipeline_completed', `Pipeline completado con ${allResponsesCount} respuestas totales`, { totalResponses: allResponsesCount })

        // Emit broadcast event for multi-user collaboration
        emitPipelineCompleted({ totalSteps: 5, projectId })

        const executiveSummary = previousSynthesis
          ? `## Resumen Ejecutivo del Pipeline (5 Pasos)\n\n` +
            `Se ejecutaron 5 oleadas secuenciales: **Brainstorm** (Lluvia de Ideas) → **Crítica** (Evaluación y Riesgos) → **Síntesis** (Integración) → **Ejecución** (Plan de Acción) → **Control de Calidad** (QA Final).\n\n` +
            `Total de respuestas generadas: ${allResponsesCount}.\n\n` +
            `### Resultado Final del Pipeline:\n${previousSynthesis.slice(0, 2000)}`
          : 'No se generó síntesis.'

        controller.enqueue(encoder.encode(sseEvent('pipeline_complete', {
          totalSteps: 5,
          totalResponses: allResponsesCount,
          executiveSummary,
        })))

        controller.close()
      } catch (error) {
        console.error('Pipeline stream error:', error)
        controller.enqueue(encoder.encode(sseEvent('error', { message: String(error) })))
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  })
}
