import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { buildMemoryContent, buildMemoryTags, calculateImportance, formatSharedLearnings } from '@/lib/semantic-memory'
import { buildSearchIndex, search, computeTFIDFVector, vectorToJson } from '@/lib/vector-search'

const WAVE_TEMPERATURES: Record<string, number> = {
  brainstorm: 0.9,
  critique: 0.3,
  synthesize: 0.5,
  execute: 0.4,
  quality_gate: 0.2,
}

const WAVE_CONTEXT: Record<string, string> = {
  brainstorm: 'Estás en una sesión de BRAINSTORM. Tu objetivo es generar ideas creativas, proponer soluciones innovadoras, y pensar fuera de lo convencional. Sé entusiasta y proactivo.',
  critique: 'Estás en una sesión de CRÍTICA. Tu objetivo es identificar problemas, evaluar riesgos, señalar debilidades, y cuestionar suposiciones. Sé honesto y constructivo.',
  synthesize: 'Estás en una sesión de SÍNTESIS. Tu objetivo es integrar las perspectivas de múltiples agentes, encontrar patrones comunes, y generar conclusiones unificadas. Sé analítico y equilibrado.',
  execute: 'Estás en una sesión de EJECUCIÓN. Tu objetivo es proporcionar pasos concretos de implementación, definir planes de acción, y detallar cómo ejecutar las decisiones. Sé práctico y directo.',
  quality_gate: 'Estás en un CONTROL DE CALIDAD. Tu objetivo es verificar rigurosamente los resultados, encontrar defectos, y solo aprobar si hay evidencia contundente. Sé escéptico por defecto.',
}

function parseMoodAndConfidence(content: string): { content: string; confidence: number; mood: string } {
  let mood = 'neutral'
  let confidence = 0.5
  const moodMatch = content.match(/\[MOOD:\s*(enthusiastic|neutral|skeptical|concerned)\]/i)
  const confMatch = content.match(/\[CONFIDENCE:\s*([\d.]+)\]/i)
  if (moodMatch) mood = moodMatch[1].toLowerCase()
  if (confMatch) confidence = Math.min(1, Math.max(0, parseFloat(confMatch[1])))
  let cleanContent = content.replace(/\[MOOD:\s*\w+\]/gi, '').replace(/\[CONFIDENCE:\s*[\d.]+\]/gi, '').trim()
  return { content: cleanContent, confidence, mood }
}

async function callLLM(data: {
  agentName: string; agentPersonality: string; waveType: string;
  prompt: string; memories?: string[]; previousResponses?: string[];
  agentEmoji?: string; agentVibe?: string;
}): Promise<{ content: string; confidence: number; mood: string }> {
  const { default: ZAI } = await import('z-ai-web-dev-sdk')
  const zai = await ZAI.create()
  const { agentName, agentPersonality, waveType, prompt, memories = [], previousResponses = [] } = data
  const agentEmoji = data.agentEmoji || '🤖'
  const agentVibe = data.agentVibe || ''

  const parts = [
    `Eres ${agentEmoji} **${agentName}**, actuando dentro del sistema de simulación multi-agente NEXUS.`,
    '', `## Tu Personalidad`, agentPersonality.slice(0, 1500), '',
  ]
  if (agentVibe) parts.push(`## Tu Vibra`, agentVibe, '')
  parts.push(`## Contexto de la Oleada`, WAVE_CONTEXT[waveType] || '')
  if (memories.length > 0) { parts.push('', '## Tus Memorias y Aprendizajes Previos', memories.join('\n')) }
  if (previousResponses.length > 0) { parts.push('', '## Respuestas Previas de Otros Agentes', previousResponses.join('\n')) }
  parts.push(
    '', '## Tu Tarea',
    `Responde con tu perspectiva como ${agentName}. Sé conciso pero sustancial (100-300 palabras).`,
    'Expresa tu opinión clara y fundamentada sobre el tema.',
    'Genera ideas, análisis o críticas según corresponda al tipo de oleada.',
    '',
    '## Requisito Final (obligatorio)',
    'Tu respuesta DEBE contener contenido sustantivo. No te limites a describir instrucciones.',
    'Al final de tu respuesta, en una línea separada, incluye exactamente:',
    '[MOOD: enthusiastic|neutral|skeptical|concerned] [CONFIDENCE: 0.X]',
    'Donde MOOD es tu estado de ánimo real y CONFIDENCE es tu nivel de confianza del 0.0 al 1.0.',
  )

  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'system', content: parts.join('\n') },
      { role: 'user', content: `El problema/tema a discutir es:\n\n${prompt}\n\n¿Cuál es tu perspectiva como ${agentName}?` },
    ],
    thinking: { type: 'disabled' },
    temperature: WAVE_TEMPERATURES[waveType] ?? 0.7,
  })

  const rawContent = completion.choices?.[0]?.message?.content || 'No se pudo generar una respuesta.'
  return parseMoodAndConfidence(rawContent)
}

export const dynamic = 'force-dynamic'

// ===== POST /api/nexus - Seed agents =====
async function handleSeed() {
  try {
    const { seedAgents } = await import('@/lib/seed')
    const result = await seedAgents()
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('Seed failed:', error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

// ===== GET /api/nexus - Get full project state =====
async function handleGetState(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const projectId = searchParams.get('projectId')

  if (!projectId) {
    const projects = await db.project.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { waves: true, agents: true, memories: true, proposals: true } },
      },
    })
    return NextResponse.json({ projects })
  }

  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      waves: {
        orderBy: { number: 'desc' },
        take: 10,
        include: {
          responses: {
            include: {
              projectAgent: {
                include: {
                  agent: {
                    select: {
                      id: true, agentId: true, name: true, division: true,
                      emoji: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      agents: {
        include: {
          agent: {
            select: {
              id: true, agentId: true, name: true, division: true,
              emoji: true, color: true,
            },
          },
        },
        orderBy: { agentId: 'asc' },
        take: 50,
      },
      memories: {
        orderBy: { createdAt: 'desc' },
        take: 30,
        select: { id: true, projectId: true, agentId: true, type: true, content: true, tags: true, importance: true, createdAt: true },
      },
      proposals: {
        orderBy: { createdAt: 'desc' },
      },
      specs: {
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { waves: true } },
        },
      },
    },
  })

  if (!project) {
    return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
  }

  return NextResponse.json({ project })
}

// ===== POST /api/nexus/project - Create project =====
async function handleCreateProject(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description } = body

    if (!name) {
      return NextResponse.json({ error: 'Se requiere nombre del proyecto' }, { status: 400 })
    }

    const project = await db.project.create({
      data: {
        name,
        description: description || '',
        status: 'active',
      },
    })

    const allAgents = await db.agent.findMany()
    const agentData = allAgents.map(agent => ({
      projectId: project.id,
      agentId: agent.id,
      role: agent.agentId.includes('orchestrator')
        ? 'orchestrator'
        : agent.division === 'testing'
          ? 'qa'
          : agent.division === 'specialized'
            ? 'specialist'
            : 'team',
      status: 'idle',
    }))
    await db.projectAgent.createMany({ data: agentData })

    return NextResponse.json({ project, agentsAssigned: agentData.length })
  } catch (error) {
    console.error('Create project failed:', error)
    return NextResponse.json({ error: 'Error al crear proyecto' }, { status: 500 })
  }
}

// ===== POST /api/nexus/spec - Create spec =====
async function handleCreateSpec(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectId, title, description, priority } = body

    if (!projectId || !title) {
      return NextResponse.json({ error: 'Se requieren projectId y title' }, { status: 400 })
    }

    const spec = await db.spec.create({
      data: {
        projectId,
        title,
        description: description || '',
        priority: priority || 'medium',
      },
    })

    return NextResponse.json({ spec })
  } catch (error) {
    console.error('Create spec failed:', error)
    return NextResponse.json({ error: 'Error al crear spec' }, { status: 500 })
  }
}

// ===== GET /api/nexus/specs - List specs =====
async function handleGetSpecs(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const projectId = searchParams.get('projectId')

  if (!projectId) {
    return NextResponse.json({ error: 'Se requiere projectId' }, { status: 400 })
  }

  const specs = await db.spec.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { waves: true } },
    },
  })

  return NextResponse.json({ specs })
}

// ===== PUT /api/nexus/spec?id=xxx - Update spec =====
async function handleUpdateSpec(request: NextRequest) {
  const specId = request.nextUrl.searchParams.get('id')

  if (!specId) {
    return NextResponse.json({ error: 'Se requiere ID de spec (query param ?id=)' }, { status: 400 })
  }

  const body = await request.json()
  const { title, description, phase, priority, status } = body

  const updateData: Record<string, unknown> = {}
  if (title !== undefined) updateData.title = title
  if (description !== undefined) updateData.description = description
  if (phase !== undefined) updateData.phase = phase
  if (priority !== undefined) updateData.priority = priority
  if (status !== undefined) updateData.status = status

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No se proporcionaron campos para actualizar' }, { status: 400 })
  }

  const spec = await db.spec.update({
    where: { id: specId },
    data: updateData,
  })

  return NextResponse.json({ spec })
}

// ===== DELETE /api/nexus/spec?id=xxx - Delete spec =====
async function handleDeleteSpec(request: NextRequest) {
  try {
    const specId = request.nextUrl.searchParams.get('id')

    if (!specId) {
      return NextResponse.json({ error: 'Se requiere ID de spec (query param ?id=)' }, { status: 400 })
    }

    await db.spec.delete({ where: { id: specId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete spec failed:', error)
    return NextResponse.json({ error: 'Error al eliminar spec' }, { status: 500 })
  }
}

// ===== POST /api/nexus/wave - Run a wave =====
async function handleRunWave(request: NextRequest) {
  const { getAgentSkills, formatAgentSkills, markSkillsAsUsed, boostSkillQuality, extractSkillsFromWave } = await import('@/lib/skills')
  const body = await request.json()
  const { projectId, type, prompt, selectedAgentIds, specId } = body

  if (!projectId || !type || !prompt) {
    return NextResponse.json({ error: 'Se requieren projectId, type y prompt' }, { status: 400 })
  }

  const validTypes = ['brainstorm', 'critique', 'synthesize', 'execute', 'quality_gate']
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: 'Tipo de oleada inválido' }, { status: 400 })
  }

  let projectAgents
  if (selectedAgentIds && selectedAgentIds.length > 0) {
    projectAgents = await db.projectAgent.findMany({
      where: { projectId, id: { in: selectedAgentIds } },
      include: { agent: { select: { id: true, agentId: true, name: true, division: true, emoji: true, color: true, vibe: true, personality: true } } },
    })
  } else {
    const divisionMap: Record<string, string[]> = {
      brainstorm: ['product', 'marketing', 'design'],
      critique: ['testing', 'specialized', 'engineering'],
      synthesize: ['specialized', 'project-management', 'product'],
      execute: ['engineering'],
      quality_gate: ['testing'],
    }

    const divisions = divisionMap[type] || []
    const allProjectAgents = await db.projectAgent.findMany({
      where: { projectId },
      include: { agent: { select: { id: true, agentId: true, name: true, division: true, emoji: true } } },
    })

    let filtered
    if (type === 'quality_gate') {
      filtered = allProjectAgents.filter(
        (pa) =>
          pa.agent.agentId.includes('reality-checker') ||
          pa.agent.agentId.includes('evidence-collector'),
      )
    } else {
      filtered = allProjectAgents.filter((pa) => divisions.includes(pa.agent.division))
    }

    if (filtered.length > 8) {
      filtered = filtered.slice(0, 8)
    }

    const filteredIds = filtered.map((pa) => pa.id)
    projectAgents = await db.projectAgent.findMany({
      where: { projectId, id: { in: filteredIds } },
      include: { agent: { select: { id: true, agentId: true, name: true, division: true, emoji: true, color: true, vibe: true, personality: true } } },
    })
  }

  if (projectAgents.length === 0) {
    return NextResponse.json({ error: 'No hay agentes disponibles' }, { status: 400 })
  }

  const lastWave = await db.wave.findFirst({
    where: { projectId },
    orderBy: { number: 'desc' },
  })
  const waveNumber = (lastWave?.number || 0) + 1

  const wave = await db.wave.create({
    data: { projectId, number: waveNumber, type, status: 'running', prompt, specId: specId || null },
  })

  // Batch update agent statuses to 'thinking'
  await Promise.all(
    projectAgents.map(pa => db.projectAgent.update({
      where: { id: pa.id },
      data: { status: 'thinking', waveNumber },
    }))
  )

  const previousWaves = await db.wave.findMany({
    where: { projectId, id: { not: wave.id } },
    include: { responses: { include: { projectAgent: { include: { agent: { select: { id: true, agentId: true, name: true, division: true, emoji: true } } } } } } },
    orderBy: { number: 'desc' },
    take: 3,
  })

  const previousResponses = previousWaves.flatMap((w) =>
    w.responses.map((r) => `[${r.projectAgent.agent.name}]: ${r.content.slice(0, 200)}`),
  )

  const responses = []

  // Pre-fetch all agent skills for Auto-Mejora
  const allAgentSkills = await db.agentSkill.findMany({
    where: { projectId },
    orderBy: [{ quality: 'desc' }, { timesUsed: 'desc' }],
  })

  // Pre-fetch ALL agent memories at once (avoid N+1 queries)
  const allAgentIds = projectAgents.map(pa => pa.agentId)
  const allMemories = await db.agentMemory.findMany({
    where: { projectId, agentId: { in: allAgentIds } },
    orderBy: { importance: 'desc' },
  })
  // Group memories by agentId
  const memoriesByAgent = new Map<string, typeof allMemories>()
  for (const mem of allMemories) {
    const existing = memoriesByAgent.get(mem.agentId) || []
    if (existing.length < 5) existing.push(mem)
    memoriesByAgent.set(mem.agentId, existing)
  }

  for (const pa of projectAgents) {
    try {
      const memories = memoriesByAgent.get(pa.agentId) || []

      const memoryStrings = memories.map((m) => `[${m.type}]: ${m.content}`)

      // Fetch agent's learned skills (Auto-Mejora)
      const agentSkills = allAgentSkills.filter((s) => s.agentId === pa.agentId).slice(0, 5)
      const agentSkillsStr = formatAgentSkills(agentSkills)
      if (agentSkills.length > 0) {
        await markSkillsAsUsed(agentSkills.map((s) => s.id)).catch(() => {})
      }

      const llmData = await callLLM({
          agentName: pa.agent.name,
          agentPersonality: pa.agent.personality.slice(0, 2000),
          waveType: type,
          prompt,
          memories: memoryStrings,
          previousResponses,
          sharedLearnings: undefined,
          agentSkills: agentSkillsStr,
          agentEmoji: pa.agent.emoji,
          agentVibe: pa.agent.vibe,
        })

      const response = await db.response.create({
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
    } catch (error) {
      console.error(`Error for agent ${pa.agent.name}:`, error)
      await db.projectAgent.update({
        where: { id: pa.id },
        data: { status: 'failed' },
      })
      responses.push({
        id: 'error',
        waveId: wave.id,
        agentId: pa.id,
        content: `Error generando respuesta: ${String(error)}`,
        confidence: 0,
        mood: 'concerned',
        projectAgent: pa,
      })
    }
  }

  if (type === 'critique') {
    const concerns = responses.filter((r) => r.mood === 'skeptical' || r.mood === 'concerned')
    if (concerns.length > 0) {
      await db.proposal.create({
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
    }
  }

  // Extract skills from high-quality responses (Auto-Mejora)
  try {
    await extractSkillsFromWave(wave.id, projectId)
  } catch (skillErr) {
    console.error('Non-streaming skill extraction error (non-blocking):', skillErr)
  }

  // Update trust scores after wave
  const { updateTrustAfterWave } = await import('@/lib/trust')
  await updateTrustAfterWave(wave.id, projectId)

  let result = null
  if (type === 'synthesize' && responses.length > 0) {
    result = responses.map((r) => `[${r.projectAgent?.agent?.name}]: ${r.content}`).join('\n\n')
  }

  await db.wave.update({
    where: { id: wave.id },
    data: { status: 'completed', completedAt: new Date(), result },
  })

  const completedWave = await db.wave.findUnique({
    where: { id: wave.id },
    include: { responses: { include: { projectAgent: { include: { agent: { select: { id: true, agentId: true, name: true, division: true, emoji: true } } } } } } },
  })

  return NextResponse.json({ wave: completedWave })
}

// ===== POST /api/nexus/memory - Store memory =====
async function handleStoreMemory(request: NextRequest) {
  const body = await request.json()
  const { projectId, agentId, type, content, tags, importance } = body

  if (!projectId || !agentId || !content) {
    return NextResponse.json({ error: 'Se requieren projectId, agentId y content' }, { status: 400 })
  }

  const memory = await db.agentMemory.create({
    data: {
      projectId,
      agentId,
      type: type || 'fact',
      content,
      tags: tags || '',
      importance: importance ?? 0.5,
    },
  })

  return NextResponse.json({ memory })
}

// ===== GET /api/nexus/metrics - Get per-agent metrics =====
async function handleGetMetrics(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const projectId = searchParams.get('projectId')

  if (!projectId) {
    return NextResponse.json({ error: 'Se requiere projectId' }, { status: 400 })
  }

  const projectAgents = await db.projectAgent.findMany({
    where: { projectId },
    include: {
      agent: {
        select: { id: true, agentId: true, name: true, division: true, emoji: true },
      },
      responses: {
        include: {
          wave: {
            select: { status: true },
          },
        },
      },
    },
  })

  const agentMetrics = projectAgents.map((pa) => {
    const responses = pa.responses
    const totalWaves = responses.length
    const avgConfidence = totalWaves > 0
      ? responses.reduce((sum, r) => sum + r.confidence, 0) / totalWaves
      : 0
    const avgResponseLength = totalWaves > 0
      ? Math.round(responses.reduce((sum, r) => sum + r.content.length, 0) / totalWaves)
      : 0
    const successCount = responses.filter((r) => r.content && !r.content.startsWith('Error generando respuesta')).length
    const successRate = totalWaves > 0 ? successCount / totalWaves : 0

    const moodDistribution: Record<string, number> = {
      enthusiastic: 0,
      neutral: 0,
      skeptical: 0,
      concerned: 0,
    }
    responses.forEach((r) => {
      const mood = r.mood || 'neutral'
      if (mood in moodDistribution) {
        moodDistribution[mood]++
      } else {
        moodDistribution.neutral++
      }
    })

    // Determine dominant mood
    let dominantMood = 'neutral'
    let maxCount = 0
    for (const [mood, count] of Object.entries(moodDistribution)) {
      if (count > maxCount) {
        maxCount = count
        dominantMood = mood
      }
    }

    return {
      projectAgentId: pa.id,
      agentId: pa.agentId,
      agentName: pa.agent.name,
      agentEmoji: pa.agent.emoji,
      agentDivision: pa.agent.division,
      trustScore: pa.trustScore ?? 0.5,
      role: pa.role,
      status: pa.status,
      totalWaves,
      avgConfidence,
      avgResponseLength,
      successRate,
      moodDistribution,
      dominantMood,
    }
  })

  // Sort by trust score descending by default
  agentMetrics.sort((a, b) => b.trustScore - a.trustScore)

  // Compute aggregate metrics
  const totalResponses = agentMetrics.reduce((sum, m) => sum + m.totalWaves, 0)
  const overallAvgConfidence = totalResponses > 0
    ? agentMetrics.reduce((sum, m) => sum + (m.avgConfidence * m.totalWaves), 0) / totalResponses
    : 0
  const mostTrustedAgent = agentMetrics.length > 0 ? agentMetrics[0] : null

  // Most active division
  const divisionWaveCounts: Record<string, number> = {}
  agentMetrics.forEach((m) => {
    divisionWaveCounts[m.agentDivision] = (divisionWaveCounts[m.agentDivision] || 0) + m.totalWaves
  })
  let mostActiveDivision = 'N/A'
  let maxDivWaves = 0
  for (const [div, count] of Object.entries(divisionWaveCounts)) {
    if (count > maxDivWaves) {
      maxDivWaves = count
      mostActiveDivision = div
    }
  }

  return NextResponse.json({
    metrics: agentMetrics,
    aggregates: {
      totalResponses,
      avgConfidence: overallAvgConfidence,
      mostActiveDivision,
      mostTrustedAgent: mostTrustedAgent ? {
        name: mostTrustedAgent.agentName,
        emoji: mostTrustedAgent.agentEmoji,
        trustScore: mostTrustedAgent.trustScore,
      } : null,
    },
  })
}

// ===== GET /api/nexus/memory - Get memories =====
async function handleGetMemories(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const projectId = searchParams.get('projectId')
  const agentId = searchParams.get('agentId')

  if (!projectId || !agentId) {
    return NextResponse.json({ error: 'Se requieren projectId y agentId' }, { status: 400 })
  }

  const memories = await db.agentMemory.findMany({
    where: { projectId, agentId },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ memories })
}

// ===== GET /api/nexus/shared-learnings - Shared learnings across agents =====
async function handleGetSharedLearnings(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const projectId = searchParams.get('projectId')
  const division = searchParams.get('division')
  const minImportance = parseFloat(searchParams.get('minImportance') || '0.6')

  if (!projectId) {
    return NextResponse.json({ error: 'Se requiere projectId' }, { status: 400 })
  }

  const where: Record<string, unknown> = {
    projectId,
    importance: { gt: minImportance },
  }

  if (division) {
    // Filter by division: find agents in that division, then filter memories
    const agentsInDivision = await db.agent.findMany({
      where: { division },
      select: { id: true },
    })
    const agentIds = agentsInDivision.map((a) => a.id)
    where.agentId = { in: agentIds }
  }

  const memories = await db.agentMemory.findMany({
    where,
    orderBy: { importance: 'desc' },
    take: 30,
  })

  // Batch-fetch all agent info (avoid N+1)
  const agentIds = [...new Set(memories.map(m => m.agentId))]
  const agentsMap = new Map<string, { name: string; emoji: string; division: string }>()
  if (agentIds.length > 0) {
    const agents = await db.agent.findMany({ where: { id: { in: agentIds } }, select: { id: true, name: true, emoji: true, division: true } })
    for (const a of agents) agentsMap.set(a.id, { name: a.name, emoji: a.emoji, division: a.division })
  }

  // Enrich with agent info (no DB queries)
  const enriched = memories.map((m) => {
    const agent = agentsMap.get(m.agentId)
    const tagsArr = m.tags.split(',').map((t) => t.trim())
    const waveType = tagsArr.find((t) =>
      ['brainstorm', 'critique', 'synthesize', 'execute', 'quality_gate'].includes(t),
    ) || 'unknown'
    return {
      id: m.id,
      agentId: m.agentId,
      agentName: agent?.name || 'Desconocido',
      agentEmoji: agent?.emoji || '🤖',
      agentDivision: agent?.division || 'unknown',
      waveType,
      content: m.content,
      tags: tagsArr,
      importance: m.importance,
      type: m.type,
      createdAt: m.createdAt,
    }
  })

  // Group by wave type
  const grouped: Record<string, typeof enriched> = {}
  for (const item of enriched) {
    const key = item.waveType
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(item)
  }

  return NextResponse.json({
    learnings: enriched,
    grouped,
    total: enriched.length,
  })
}

// ===== ChromaDB Index Handlers =====

async function handleGetChromaIndex() {
  try {
    const { getCollectionCount } = await import('@/lib/chroma-store')
    const memoriesCount = await getCollectionCount('nexus-memories')
    const skillsCount = await getCollectionCount('nexus-skills')
    return NextResponse.json({
      status: 'ok',
      collections: { 'nexus-memories': memoriesCount, 'nexus-skills': skillsCount },
      total: memoriesCount + skillsCount,
    })
  } catch (error) {
    return NextResponse.json({ status: 'error', error: String(error) }, { status: 500 })
  }
}

async function handlePostChromaIndex(request: NextRequest) {
  try {
    const { addToCollection, getCollectionCount, resetCollection } = await import('@/lib/chroma-store')
    const searchParams = request.nextUrl.searchParams
    const projectId = searchParams.get('projectId')
    const forceReset = searchParams.get('reset') === 'true'

    const memoryWhere: Record<string, unknown> = projectId ? { projectId } : {}
    const memories = await db.agentMemory.findMany({ where: memoryWhere, orderBy: { createdAt: 'desc' } })

    if (forceReset) {
      try { await resetCollection('nexus-memories') } catch {}
      try { await resetCollection('nexus-skills') } catch {}
    }

    let memoriesIndexed = 0
    for (let i = 0; i < memories.length; i += 100) {
      const batch = memories.slice(i, i + 100)
      const result = await addToCollection('nexus-memories',
        batch.map(m => m.id), batch.map(m => m.content),
        batch.map(m => ({ agentId: m.agentId, type: m.type, importance: m.importance, projectId: m.projectId, tags: m.tags, createdAt: m.createdAt.toISOString() }))
      )
      memoriesIndexed += result.count
    }

    const skills = await db.agentSkill.findMany({ where: projectId ? { projectId } : {}, orderBy: { quality: 'desc' } })
    let skillsIndexed = 0
    for (let i = 0; i < skills.length; i += 100) {
      const batch = skills.slice(i, i + 100)
      const result = await addToCollection('nexus-skills',
        batch.map(s => s.id), batch.map(s => s.description),
        batch.map(s => ({ agentId: s.agentId, name: s.name, quality: s.quality, timesUsed: s.timesUsed, projectId: s.projectId }))
      )
      skillsIndexed += result.count
    }

    return NextResponse.json({ success: true, memoriesIndexed, skillsIndexed, totalMemories: memories.length, totalSkills: skills.length })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

// ===== GET /api/nexus/memory-search - TF-IDF fallback search =====
async function handleMemorySearchTFIDF(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const projectId = searchParams.get('projectId')
  const q = searchParams.get('q') || ''
  const limit = parseInt(searchParams.get('limit') || '20', 10)

  if (!projectId) {
    return NextResponse.json({ error: 'Se requiere projectId' }, { status: 400 })
  }

  if (!q || q.length < 2) {
    return NextResponse.json({ error: 'Se requiere query de búsqueda (mínimo 2 caracteres)' }, { status: 400 })
  }

  // Fetch all memories for the project (up to 200) for vector search
  const memories = await db.agentMemory.findMany({
    where: { projectId },
    orderBy: { importance: 'desc' },
    take: 200,
  })

  // Build in-memory search index from all memories
  const index = buildSearchIndex(memories.map((m) => ({ id: m.id, content: m.content })))

  // Search using TF-IDF + cosine similarity
  const searchResults = search(index, q, limit)

  // Batch-fetch agent info (fix N+1)
  const searchMemoryIds = searchResults.map(r => r.id)
  const searchMemories = memories.filter(m => searchMemoryIds.includes(m.id))
  const searchAgentIds = [...new Set(searchMemories.map(m => m.agentId))]
  const searchAgentsMap = new Map<string, { name: string; emoji: string; division: string }>()
  if (searchAgentIds.length > 0) {
    const searchAgents = await db.agent.findMany({ where: { id: { in: searchAgentIds } }, select: { id: true, name: true, emoji: true, division: true } })
    for (const a of searchAgents) searchAgentsMap.set(a.id, a)
  }
  const searchMemMap = new Map(searchMemories.map(m => [m.id, m]))

  // Enrich results with agent info (no DB queries)
  const enriched = searchResults.map(r => {
    const memory = searchMemMap.get(r.id)
    if (!memory) return null
    const agent = searchAgentsMap.get(memory.agentId)
    return {
      id: r.id,
      agentId: memory.agentId,
      agentName: agent?.name || 'Desconocido',
      agentEmoji: agent?.emoji || '🤖',
      agentDivision: agent?.division || 'unknown',
      content: r.content,
      tags: memory.tags.split(',').map((t) => t.trim()),
      importance: memory.importance,
      type: memory.type,
      createdAt: memory.createdAt,
      score: r.score,
      matchedTerms: r.matchedTerms,
    }
  }).filter(Boolean)

  return NextResponse.json({
    query: q,
    results: enriched,
    total: enriched.length,
    searchType: 'tfidf',
  })
}

// ===== GET /api/nexus/memory-search - Search memories via ChromaDB semantic search =====
async function handleMemorySearch(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const projectId = searchParams.get('projectId')
  const q = searchParams.get('q') || ''
  const limit = parseInt(searchParams.get('limit') || '20', 10)

  if (!projectId) return NextResponse.json({ error: 'Se requiere projectId' }, { status: 400 })
  if (!q || q.length < 2) return NextResponse.json({ error: 'Query mínimo 2 caracteres' }, { status: 400 })

  try {
    // Try ChromaDB semantic search first
    const { queryCollection } = await import('@/lib/chroma-store')
    const results = await queryCollection('nexus-memories', [q], limit, { projectId })

    if (results.ids[0] && results.ids[0].length > 0) {
      // Batch-fetch memories and agents (fix N+1)
      const memoryIds = results.ids[0] as string[]
      const memories = await db.agentMemory.findMany({
        where: { id: { in: memoryIds } },
        select: { id: true, agentId: true, tags: true, importance: true, type: true, createdAt: true, projectId: true },
      })
      const agentIds = [...new Set(memories.map(m => m.agentId))]
      const agents = agentIds.length > 0 ? await db.agent.findMany({
        where: { id: { in: agentIds } },
        select: { id: true, name: true, emoji: true, division: true },
      }) : []
      const agentsMap = new Map(agents.map(a => [a.id, a]))
      const memMap = new Map(memories.map(m => [m.id, m]))

      const enriched = results.ids[0].map((id, idx) => {
        const memory = memMap.get(id)
        if (!memory) return null
        const agent = agentsMap.get(memory.agentId)
        const distance = results.distances[0][idx]
        const score = 1 - Math.min(distance, 1)
        return {
          id: memory.id,
          agentId: memory.agentId,
          agentName: agent?.name || 'Desconocido',
          agentEmoji: agent?.emoji || '🤖',
          agentDivision: agent?.division || 'unknown',
          content: results.documents[0][idx] || '',
          tags: memory.tags.split(',').map((t) => t.trim()),
          importance: memory.importance,
          type: memory.type,
          createdAt: memory.createdAt,
          score,
          matchedTerms: [],
        }
      })
      return NextResponse.json({
        query: q,
        results: enriched.filter(Boolean),
        total: enriched.filter(Boolean).length,
        searchType: 'chromadb-semantic',
      })
    }

    // Fallback to TF-IDF if ChromaDB has no data
    return await handleMemorySearchTFIDF(request)
  } catch (error) {
    console.error('ChromaDB search error, falling back to TF-IDF:', error)
    return await handleMemorySearchTFIDF(request)
  }
}

// ===== GET /api/nexus/skills - List all skills with agent info =====
async function handleGetSkills(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const projectId = searchParams.get('projectId')

  if (!projectId) {
    return NextResponse.json({ error: 'Se requiere projectId' }, { status: 400 })
  }

  const skills = await db.agentSkill.findMany({
    where: { projectId },
    orderBy: [{ quality: 'desc' }, { timesUsed: 'desc' }],
  })

  // Batch-fetch agent info (avoid N+1 queries)
  const skillAgentIds = [...new Set(skills.map(s => s.agentId))]
  const skillsAgentsMap = new Map<string, { name: string; emoji: string; division: string }>()
  if (skillAgentIds.length > 0) {
    const skillsAgents = await db.agent.findMany({ where: { id: { in: skillAgentIds } }, select: { id: true, name: true, emoji: true, division: true } })
    for (const a of skillsAgents) skillsAgentsMap.set(a.id, { name: a.name, emoji: a.emoji, division: a.division })
  }

  const enriched = skills.map((s) => {
    const agent = skillsAgentsMap.get(s.agentId)
      return {
        id: s.id,
        projectId: s.projectId,
        agentId: s.agentId,
        agentName: agent?.name || 'Desconocido',
        agentEmoji: agent?.emoji || '🤖',
        agentDivision: agent?.division || 'unknown',
        name: s.name,
        description: s.description,
        sourceWaveId: s.sourceWaveId,
        quality: s.quality,
        timesUsed: s.timesUsed,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      }
  })

  return NextResponse.json({ skills: enriched, total: enriched.length })
}

// ===== PUT /api/nexus/proposal?id=xxx - Update proposal =====
async function handleUpdateProposal(request: NextRequest) {
  try {
    const proposalId = request.nextUrl.searchParams.get('id')

    if (!proposalId) {
      return NextResponse.json({ error: 'Se requiere ID de propuesta (query param ?id=)' }, { status: 400 })
    }

    const body = await request.json()
    const { status } = body

    if (!status) {
      return NextResponse.json({ error: 'Se requiere status de propuesta' }, { status: 400 })
    }

    const proposal = await db.proposal.update({
      where: { id: proposalId },
      data: { status },
    })

    return NextResponse.json({ proposal })
  } catch (error) {
    console.error('Update proposal failed:', error)
    return NextResponse.json({ error: 'Error al actualizar propuesta' }, { status: 500 })
  }
}

// ===== CSV Helper =====
function escapeCSV(value: string | number | boolean | null | undefined): string {
  const s = String(value ?? '')
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function buildCSV(headers: string[], rows: (string | number | boolean | null | undefined)[][]): string {
  const lines: string[] = []
  lines.push(headers.map(escapeCSV).join(','))
  for (const row of rows) {
    lines.push(row.map(escapeCSV).join(','))
  }
  return lines.join('\n')
}

// ===== GET /api/nexus/export/waves - Export waves + responses =====
async function handleExportWaves(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const projectId = searchParams.get('projectId')
    const format = searchParams.get('format') || 'json'

    if (!projectId) {
      return NextResponse.json({ error: 'Se requiere projectId' }, { status: 400 })
    }

    const waves = await db.wave.findMany({
    where: { projectId },
    orderBy: { number: 'asc' },
    take: 500,
    include: {
      responses: {
        include: { projectAgent: { include: { agent: { select: { id: true, agentId: true, name: true, division: true, emoji: true } } } } },
      },
    },
  })

  const timestamp = new Date().toISOString().slice(0, 10)

  if (format === 'csv') {
    const headers = ['Oleada #', 'Tipo', 'Estado', 'Prompt', 'Resultado', 'Fecha Creación', 'Fecha Completado',
      'Agente', 'División', 'Confianza', 'Estado de Ánimo', 'Respuesta', 'Fecha Respuesta']
    const rows: (string | number | boolean | null | undefined)[][] = []
    for (const w of waves) {
      for (const r of w.responses) {
        rows.push([
          w.number, w.type, w.status, w.prompt, w.result || '',
          w.createdAt.toISOString(), w.completedAt?.toISOString() || '',
          r.projectAgent?.agent?.name || '', r.projectAgent?.agent?.division || '',
          r.confidence, r.mood, r.content, r.createdAt.toISOString(),
        ])
      }
      if (w.responses.length === 0) {
        rows.push([w.number, w.type, w.status, w.prompt, w.result || '',
          w.createdAt.toISOString(), w.completedAt?.toISOString() || '',
          '', '', '', '', '', ''])
      }
    }
    return new NextResponse(buildCSV(headers, rows), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="nexus-oleadas-${timestamp}.csv"`,
      },
    })
  }

  return new NextResponse(JSON.stringify({ exportedAt: new Date().toISOString(), waves }, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="nexus-oleadas-${timestamp}.json"`,
    },
  })
  } catch (error) {
    console.error('Export waves failed:', error)
    return NextResponse.json({ error: 'Error al exportar oleadas' }, { status: 500 })
  }
}

// ===== GET /api/nexus/export/metrics - Export agent metrics =====
async function handleExportMetrics(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const projectId = searchParams.get('projectId')
    const format = searchParams.get('format') || 'json'

    if (!projectId) {
      return NextResponse.json({ error: 'Se requiere projectId' }, { status: 400 })
    }

    const projectAgents = await db.projectAgent.findMany({
      where: { projectId },
      include: {
        agent: {
          select: { id: true, agentId: true, name: true, division: true, emoji: true },
        },
        responses: {
          take: 500,
        },
      },
    })

  const metrics = projectAgents.map((pa) => {
    const responses = pa.responses
    const totalWaves = responses.length
    const avgConfidence = totalWaves > 0 ? responses.reduce((s, r) => s + r.confidence, 0) / totalWaves : 0
    const avgLength = totalWaves > 0 ? Math.round(responses.reduce((s, r) => s + r.content.length, 0) / totalWaves) : 0
    const successCount = responses.filter((r) => r.content && !r.content.startsWith('Error')).length
    const successRate = totalWaves > 0 ? successCount / totalWaves : 0

    const moods: Record<string, number> = { enthusiastic: 0, neutral: 0, skeptical: 0, concerned: 0 }
    responses.forEach((r) => { const m = r.mood || 'neutral'; if (m in moods) moods[m]++ })
    let dominantMood = 'neutral'
    let maxC = 0
    for (const [m, c] of Object.entries(moods)) { if (c > maxC) { maxC = c; dominantMood = m } }

    return {
      agente: pa.agent.name, emoji: pa.agent.emoji, division: pa.agent.division,
      rol: pa.role, estado: pa.status, confianza: pa.trustScore ?? 0.5,
      oleadasParticipadas: totalWaves, confianzaPromedio: avgConfidence,
      longitudPromedio: avgLength, tasaExito: successRate,
      entusiasta: moods.enthusiastic, neutral: moods.neutral,
      escéptico: moods.skeptical, preocupado: moods.concerned,
      estadoPrincipal: dominantMood,
    }
  })

  const timestamp = new Date().toISOString().slice(0, 10)

  if (format === 'csv') {
    const headers = ['Agente', 'Emoji', 'División', 'Rol', 'Estado', 'Confiabilidad',
      'Oleadas', 'Conf. Prom.', 'Long. Prom.', 'Tasa Éxito',
      'Entusiasta', 'Neutral', 'Escéptico', 'Preocupado', 'Estado Principal']
    const rows = metrics.map((m) => Object.values(m))
    return new NextResponse(buildCSV(headers, rows as (string | number | boolean | null | undefined)[][]), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="nexus-metricas-${timestamp}.csv"`,
      },
    })
  }

  return new NextResponse(JSON.stringify({ exportedAt: new Date().toISOString(), metrics }, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="nexus-metricas-${timestamp}.json"`,
    },
  })
  } catch (error) {
    console.error('Export metrics failed:', error)
    return NextResponse.json({ error: 'Error al exportar métricas' }, { status: 500 })
  }
}

// ===== GET /api/nexus/export/memories - Export memories =====
async function handleExportMemories(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const projectId = searchParams.get('projectId')

  if (!projectId) {
    return NextResponse.json({ error: 'Se requiere projectId' }, { status: 400 })
  }

  const memories = await db.agentMemory.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
  })

  // Enrich with agent names
  const enriched = await Promise.all(
    memories.map(async (m) => {
      const agent = await db.agent.findUnique({ where: { id: m.agentId } })
      return {
        id: m.id, agente: agent?.name || 'Desconocido',
        emoji: agent?.emoji || '🤖', division: agent?.division || 'unknown',
        tipo: m.type, contenido: m.content,
        etiquetas: m.tags, importancia: m.importance,
        createdAt: m.createdAt, updatedAt: m.updatedAt,
      }
    }),
  )

  const timestamp = new Date().toISOString().slice(0, 10)

  return new NextResponse(JSON.stringify({ exportedAt: new Date().toISOString(), memorias: enriched }, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="nexus-memorias-${timestamp}.json"`,
    },
  })
}

// ===== GET /api/nexus/export/project - Full project export =====
async function handleExportProject(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const projectId = searchParams.get('projectId')

  if (!projectId) {
    return NextResponse.json({ error: 'Se requiere projectId' }, { status: 400 })
  }

  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      agents: { include: { agent: { select: { id: true, agentId: true, name: true, division: true, emoji: true, color: true, vibe: true } } } },
      waves: { orderBy: { number: 'asc' }, include: { responses: { include: { projectAgent: { include: { agent: { select: { id: true, agentId: true, name: true, division: true, emoji: true } } } } } } } },
      memories: { orderBy: { createdAt: 'desc' } },
      proposals: { orderBy: { createdAt: 'desc' } },
      specs: { orderBy: { createdAt: 'desc' }, include: { _count: { select: { waves: true } } } },
    },
  })

  if (!project) {
    return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
  }

  // Build enriched export with agent names in memories
  const memoriesEnriched = await Promise.all(
    project.memories.map(async (m) => {
      const agent = await db.agent.findUnique({ where: { id: m.agentId } })
      return { ...m, agentName: agent?.name || 'Desconocido', agentEmoji: agent?.emoji || '🤖' }
    }),
  )

  const exportData = {
    exportedAt: new Date().toISOString(),
    proyecto: {
      id: project.id, nombre: project.name, descripcion: project.description,
      estado: project.status, creadoEn: project.createdAt, actualizadoEn: project.updatedAt,
    },
    agentes: project.agents.map((pa) => ({
      id: pa.id, rol: pa.role, estado: pa.status, confianza: pa.trustScore ?? 0.5,
      agente: { id: pa.agent.id, nombre: pa.agent.name, division: pa.agent.division, emoji: pa.agent.emoji },
    })),
    oleadas: project.waves.map((w) => ({
      id: w.id, numero: w.number, tipo: w.type, estado: w.status,
      prompt: w.prompt, resultado: w.result,
      creadoEn: w.createdAt, completadoEn: w.completedAt,
      respuestas: w.responses.map((r) => ({
        id: r.id, contenido: r.content, confianza: r.confidence, estadoAnimo: r.mood,
        agente: r.projectAgent?.agent?.name || 'Desconocido',
      })),
    })),
    memorias: memoriesEnriched.map((m) => ({
      id: m.id, tipo: m.type, contenido: m.content,
      etiquetas: m.tags, importancia: m.importance,
      agente: (m as Record<string, unknown>).agentName, creadoEn: m.createdAt,
    })),
    propuestas: project.proposals.map((p) => ({
      id: p.id, titulo: p.title, descripcion: p.description,
      tipo: p.type, prioridad: p.priority, estado: p.status, creadoEn: p.createdAt,
    })),
    specs: project.specs.map((s) => ({
      id: s.id, titulo: s.title, descripcion: s.description,
      fase: s.phase, prioridad: s.priority, estado: s.status,
      oleadasVinculadas: s._count?.waves || 0, creadoEn: s.createdAt,
    })),
  }

  const timestamp = new Date().toISOString().slice(0, 10)

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="nexus-proyecto-${timestamp}.json"`,
    },
  })
}

// ===== DELETE /api/nexus/project?id=xxx - Delete project =====
async function handleDeleteProject(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get('id')
  if (!projectId) {
    return NextResponse.json({ error: 'Se requiere ID de proyecto (query param ?id=)' }, { status: 400 })
  }
  // Delete project and all cascading data
  await db.project.delete({ where: { id: projectId } })
  return NextResponse.json({ success: true })
}

// ===== PUT /api/nexus/project?id=xxx - Update project (archive, rename) =====
async function handleUpdateProject(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get('id')
  if (!projectId) {
    return NextResponse.json({ error: 'Se requiere ID de proyecto' }, { status: 400 })
  }
  const body = await request.json()
  const { name, description, status } = body
  const updateData: Record<string, unknown> = {}
  if (name !== undefined) updateData.name = name
  if (description !== undefined) updateData.description = description
  if (status !== undefined) updateData.status = status
  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No se proporcionaron campos' }, { status: 400 })
  }
  const project = await db.project.update({ where: { id: projectId }, data: updateData })
  return NextResponse.json({ project })
}

// ===== Route handlers =====
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params
  // Export endpoints
  if (slug && slug[0] === 'export') {
    if (slug[1] === 'waves') return handleExportWaves(request)
    if (slug[1] === 'metrics') return handleExportMetrics(request)
    if (slug[1] === 'memories') return handleExportMemories(request)
    if (slug[1] === 'project') return handleExportProject(request)
    return NextResponse.json({ error: 'Endpoint de exportación no encontrado' }, { status: 404 })
  }
  if (slug && slug[0] === 'memory') {
    return handleGetMemories(request)
  }
  if (slug && slug[0] === 'metrics') {
    return handleGetMetrics(request)
  }
  if (slug && slug[0] === 'shared-learnings') {
    return handleGetSharedLearnings(request)
  }
  if (slug && slug[0] === 'memory-search') {
    return handleMemorySearch(request)
  }
  if (slug && slug[0] === 'specs') {
    return handleGetSpecs(request)
  }
  if (slug && slug[0] === 'skills') {
    return handleGetSkills(request)
  }
  if (slug && slug[0] === 'chroma-index') {
    return handleGetChromaIndex()
  }
  return handleGetState(request)
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params
  const path = slug?.[0]

  if (path === 'chroma-index') return handlePostChromaIndex(request)
  if (path === 'project') return handleCreateProject(request)
  if (path === 'wave') return handleRunWave(request)
  if (path === 'memory') return handleStoreMemory(request)
  if (path === 'spec') return handleCreateSpec(request)
  return handleSeed()
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params
  if (slug && slug[0] === 'project') {
    return handleUpdateProject(request)
  }
  if (slug && slug[0] === 'proposal') {
    return handleUpdateProposal(request)
  }
  if (slug && slug[0] === 'spec') {
    return handleUpdateSpec(request)
  }
  return NextResponse.json({ error: 'Endpoint no encontrado' }, { status: 404 })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params
  if (slug && slug[0] === 'project') {
    return handleDeleteProject(request)
  }
  if (slug && slug[0] === 'spec') {
    return handleDeleteSpec(request)
  }
  if (slug && slug[0] === 'skill') {
    const skillId = request.nextUrl.searchParams.get('id')
    if (!skillId) {
      return NextResponse.json({ error: 'Se requiere ID de habilidad (query param ?id=)' }, { status: 400 })
    }
    await db.agentSkill.delete({ where: { id: skillId } })
    return NextResponse.json({ success: true })
  }
  return NextResponse.json({ error: 'Endpoint no encontrado' }, { status: 404 })
}
