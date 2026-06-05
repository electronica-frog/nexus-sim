import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { VALID_WAVE_TYPES, DIVISION_MAP } from '@/lib/nexus-wave'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes for LLM calls

function sseEvent(event: string, data: object): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

// SSE heartbeat comment to keep connection alive during long LLM calls
function sseHeartbeat(): string {
  return `: heartbeat ${Date.now()}\n\n`
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { projectId, type, prompt, selectedAgentIds } = body

  if (!projectId || !type || !prompt) {
    return new Response(JSON.stringify({ error: 'Se requieren projectId, type y prompt' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!VALID_WAVE_TYPES.includes(type)) {
    return new Response(JSON.stringify({ error: 'Tipo de oleada inválido' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      // Dynamic imports — loaded on demand, not at module evaluation
      const { callLLM } = await import('@/lib/nexus-wave')
      const { updateTrustAfterWave } = await import('@/lib/trust')
      const { buildMemoryContent, buildMemoryTags, calculateImportance, formatSharedLearnings } = await import('@/lib/semantic-memory')
      const { getAgentSkills, formatAgentSkills, markSkillsAsUsed, boostSkillQuality, extractSkillsFromWave } = await import('@/lib/skills')
      const { addLog } = await import('@/lib/system-logs')
      const { computeTFIDFVector, vectorToJson } = await import('@/lib/vector-search')
      const { emitWaveStarted, emitWaveAgentResponding, emitWaveCompleted } = await import('@/lib/event-bus')
      const { getRelevantMemories, formatMemoryContext, touchMemories, extractAndStoreWaveMemories } = await import('@/lib/memory-store')

      try {
        let projectAgents
        if (selectedAgentIds && selectedAgentIds.length > 0) {
          projectAgents = await db.projectAgent.findMany({
            where: { projectId, id: { in: selectedAgentIds } },
            include: { agent: { select: { id: true, agentId: true, name: true, division: true, emoji: true, color: true, vibe: true, personality: true } } },
          })
        } else {
          const divisions = DIVISION_MAP[type] || []
          // Step 1: lightweight query for filtering (only agentId + division)
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
            )
          } else {
            filtered = allProjectAgents.filter((pa) => divisions.includes(pa.agent.division))
          }
          if (filtered.length > 8) filtered = filtered.slice(0, 8)
          // Step 2: fetch full data only for filtered agents
          const filteredIds = filtered.map((pa) => pa.id)
          projectAgents = await db.projectAgent.findMany({
            where: { projectId, id: { in: filteredIds } },
            include: { agent: { select: { id: true, agentId: true, name: true, division: true, emoji: true, color: true, vibe: true, personality: true } } },
          })
        }

        if (projectAgents.length === 0) {
          controller.enqueue(encoder.encode(sseEvent('error', { message: 'No hay agentes disponibles' })))
          controller.close()
          return
        }

        const lastWave = await db.wave.findFirst({
          where: { projectId },
          orderBy: { number: 'desc' },
        })
        const waveNumber = (lastWave?.number || 0) + 1

        const wave = await db.wave.create({
          data: { projectId, number: waveNumber, type, status: 'running', prompt },
        })

        await addLog(projectId, 'wave_created', `Oleada #${waveNumber} (${type}) creada con ${projectAgents.length} agentes`, { waveId: wave.id, waveNumber, type, agentCount: projectAgents.length })

        // Emit broadcast event for multi-user collaboration
        emitWaveStarted({ waveId: wave.id, type, prompt, projectId })

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

        // Fetch shared learnings from other waves (semantic memory enhancement)
        const sharedLearningsRaw = await db.agentMemory.findMany({
          where: { projectId, importance: { gt: 0.6 } },
          orderBy: { importance: 'desc' },
          take: 10,
        })

        // Enrich shared learnings with agent info (batch fetch — avoid N+1)
        const learningAgentIds = [...new Set(sharedLearningsRaw.slice(0, 8).map((m) => m.agentId))]
        const learningAgents = learningAgentIds.length > 0
          ? await db.agent.findMany({ where: { id: { in: learningAgentIds } }, select: { id: true, name: true, emoji: true } })
          : []
        const agentMap = new Map(learningAgents.map((a) => [a.id, a]))
        const sharedLearningsAgents = sharedLearningsRaw.slice(0, 8).map((m) => {
          const agent = agentMap.get(m.agentId)
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

        // Pre-fetch all agent skills for this project (batch fetch)
        const allAgentSkills = await db.agentSkill.findMany({
          where: { projectId },
          orderBy: [{ quality: 'desc' }, { timesUsed: 'desc' }],
        })

        const responses: Array<{
          id: string; content: string; confidence: number; mood: string;
          projectAgent: typeof pa;
        }> = []

        for (let i = 0; i < projectAgents.length; i++) {
          const pa = projectAgents[i]

          controller.enqueue(encoder.encode(sseEvent('agent_start', {
            agentId: pa.id,
            agentName: pa.agent.name,
            emoji: pa.agent.emoji,
            division: pa.agent.division,
            index: i,
            total: projectAgents.length,
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
            const skillIds = agentSkills.map((s) => s.id)

            // Mark skills as used
            if (skillIds.length > 0) {
              await markSkillsAsUsed(skillIds).catch(() => {})
            }

            // Fetch Mem0 long-term memories for this agent
            let mem0Context = ''
            try {
              const relevantMemories = await getRelevantMemories(projectId, pa.agentId, 5)
              if (relevantMemories.length > 0) {
                mem0Context = formatMemoryContext(relevantMemories)
                // Touch these memories to boost their relevance
                await touchMemories(relevantMemories.map((m) => m.id)).catch(() => {})
              }
            } catch { /* non-blocking */ }

            // Emit broadcast event: agent responding
            emitWaveAgentResponding({ waveId: wave.id, agentName: pa.agent.name, agentEmoji: pa.agent.emoji, projectId })

            // Send heartbeat before LLM call to keep SSE connection alive
            controller.enqueue(encoder.encode(sseHeartbeat()))

            // Retry up to 2 times on LLM failure
            let llmData = null
            let lastError: Error | null = null
            for (let attempt = 0; attempt < 2; attempt++) {
              try {
                llmData = await callLLM({
                  agentName: pa.agent.name,
                  agentPersonality: pa.agent.personality.slice(0, 2000),
                  waveType: type,
                  prompt,
                  memories: memoryStrings,
                  previousResponses,
                  sharedLearnings: sharedLearningsStr,
                  agentSkills: agentSkillsStr,
                  mem0Context,
                  agentEmoji: pa.agent.emoji,
                  agentVibe: pa.agent.vibe,
                })
                break // Success, exit retry loop
              } catch (retryErr) {
                lastError = retryErr as Error
                console.warn(`Attempt ${attempt + 1}/2 failed for ${pa.agent.name}:`, String(retryErr))
                if (attempt === 1) throw lastError // Final attempt failed
              }
            }

            if (!llmData) throw lastError || new Error('LLM returned no data')

            const response = await db.response.create({
              data: {
                waveId: wave.id,
                agentId: pa.id,
                content: llmData.content,
                confidence: llmData.confidence,
                mood: llmData.mood,
              },
            })

            // Boost skill quality if response was good (Auto-Mejora)
            await boostSkillQuality(projectId, pa.agentId, llmData.confidence, llmData.mood).catch(() => {})

            // Enhanced semantic memory — captures actual insight, not just metadata
            const memoryContent = buildMemoryContent({
              waveType: type,
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
                }),
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

            responses.push({ ...response, projectAgent: pa })

            controller.enqueue(encoder.encode(sseEvent('agent_response', {
              agentId: pa.id,
              content: llmData.content,
              confidence: llmData.confidence,
              mood: llmData.mood,
              agentName: pa.agent.name,
              emoji: pa.agent.emoji,
              division: pa.agent.division,
            })))

            controller.enqueue(encoder.encode(sseEvent('agent_done', {
              agentId: pa.id,
              status: 'done',
            })))
          } catch (error) {
            console.error(`Error for agent ${pa.agent.name}:`, error)
            await db.projectAgent.update({
              where: { id: pa.id },
              data: { status: 'failed' },
            })
            responses.push({
              id: 'error',
              content: 'Error generando respuesta. Intenta de nuevo.',
              confidence: 0,
              mood: 'concerned',
              projectAgent: pa,
            })
            controller.enqueue(encoder.encode(sseEvent('agent_response', {
              agentId: pa.id,
              content: 'Error: el agente no pudo generar una respuesta.',
              confidence: 0,
              mood: 'concerned',
              agentName: pa.agent.name,
              emoji: pa.agent.emoji,
              division: pa.agent.division,
            })))
            controller.enqueue(encoder.encode(sseEvent('agent_done', {
              agentId: pa.id,
              status: 'failed',
            })))
          }
        }

        if (type === 'critique') {
          const concerns = responses.filter((r) => r.mood === 'skeptical' || r.mood === 'concerned')
          if (concerns.length > 0) {
            const proposal = await db.proposal.create({
              data: {
                projectId,
                waveId: wave.id,
                title: `Propuesta de mejora - Oleada #${waveNumber}`,
                description: `Se identificaron ${concerns.length} preocupaciones en la oleada de crítica. Revisar los hallazgos de los agentes y tomar acción.`,
                type: 'enhancement',
                priority: concerns.length > 3 ? 'high' : 'medium',
                status: 'proposed',
              },
            })
            await addLog(projectId, 'proposal_created', `Propuesta creada desde oleada de crítica #${waveNumber}`, { proposalId: proposal.id, waveNumber, concernCount: concerns.length })
          }
        }

        // Extract Mem0 long-term memories from wave results (non-blocking)
        try {
          const agentIdMap: Record<string, string> = {}
          for (const r of responses) {
            if (r.projectAgent) agentIdMap[r.projectAgent.id] = r.projectAgent.agentId
          }
          const mem0Count = await extractAndStoreWaveMemories(
            projectId, wave.id, waveNumber, type,
            responses.map((r) => ({ agentId: r.projectAgent?.id || r.agentId, content: r.content, confidence: r.confidence, mood: r.mood })),
            agentIdMap
          )
          if (mem0Count > 0) {
            await addLog(projectId, 'mem0_stored', `${mem0Count} memorias de largo plazo almacenadas desde oleada #${waveNumber}`, { waveNumber, count: mem0Count })
          }
        } catch (mem0Err) {
          console.error('Mem0 extraction error (non-blocking):', mem0Err)
        }

        // Extract skills from high-quality responses (Auto-Mejora)
        try {
          const extractedCount = await extractSkillsFromWave(wave.id, projectId)
          if (extractedCount > 0) {
            await addLog(projectId, 'skill_learned', `${extractedCount} nuevas habilidades extraídas de la oleada #${waveNumber}`, { waveNumber, count: extractedCount })
          }
        } catch (skillErr) {
          console.error('Skill extraction error (non-blocking):', skillErr)
        }

        // Update trust scores after wave completes
        await updateTrustAfterWave(wave.id, projectId)

        await addLog(projectId, 'wave_completed', `Oleada #${waveNumber} (${type}) completada con ${responses.length} respuestas`, { waveNumber, type, responseCount: responses.length })

        // Emit broadcast event for multi-user collaboration
        emitWaveCompleted({ waveId: wave.id, type, responseCount: responses.length, projectId })

        // For synthesize waves, generate a trust-weighted synthesis
        let result = null
        if (type === 'synthesize' && responses.length > 0) {
          // Sort responses by agent trust score (highest first)
          const responsesWithTrust = await Promise.all(
            responses.map(async (r) => {
              const pa = await db.projectAgent.findUnique({
                where: { id: r.projectAgent?.id || r.agentId },
                select: { trustScore: true },
              })
              return { ...r, trustScore: pa?.trustScore ?? 0.5 }
            }),
          )
          const sorted = responsesWithTrust.sort((a, b) => b.trustScore - a.trustScore)
          result = sorted.map((r, i) => {
            const trustLabel = r.trustScore >= 0.7 ? '[Confiabilidad Alta]' : r.trustScore >= 0.4 ? '[Confiabilidad Media]' : '[Confiabilidad Baja]'
            return `${trustLabel} [${r.projectAgent?.agent?.name}]: ${r.content}`
          }).join('\n\n')
        }

        await db.wave.update({
          where: { id: wave.id },
          data: { status: 'completed', completedAt: new Date(), result },
        })

        controller.enqueue(encoder.encode(sseEvent('wave_complete', {
          waveId: wave.id,
          waveNumber,
          totalResponses: responses.length,
          synthesis: result,
          type,
        })))

        controller.close()
      } catch (error) {
        console.error('Stream error:', error)
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
