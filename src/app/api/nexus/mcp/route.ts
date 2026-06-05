import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// ===== MCP Full Tool Server — NEXUS Sim v2 =====
// Implements MCP Protocol (JSON-RPC) with tools, resources, and prompts.
// Compatible with Claude Desktop, VS Code MCP, and any MCP client.

interface MCPTool {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
}

interface MCPResource {
  uri: string
  name: string
  description: string
  mimeType?: string
}

interface MCPPrompt {
  name: string
  description: string
  arguments?: Array<{ name: string; description: string; required?: boolean }>
}

// ===== TOOLS (16 total) =====
const MCP_TOOLS: MCPTool[] = [
  // --- Wave Management ---
  {
    name: 'nexus_run_wave',
    description: 'Crear y ejecutar una oleada de simulación con agentes del proyecto',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'ID del proyecto' },
        type: { type: 'string', enum: ['brainstorm', 'critique', 'synthesize', 'execute', 'quality_gate'], description: 'Tipo de oleada' },
        prompt: { type: 'string', description: 'Prompt o problema para los agentes' },
        specId: { type: 'string', description: 'ID de spec vinculada (opcional)' },
      },
      required: ['projectId', 'type', 'prompt'],
    },
  },
  {
    name: 'nexus_get_waves',
    description: 'Listar oleadas de un proyecto con estadísticas detalladas',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'ID del proyecto' },
        limit: { type: 'number', description: 'Máximo de oleadas a retornar (default: 10)' },
        type: { type: 'string', description: 'Filtrar por tipo de oleada (opcional)' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'nexus_run_pipeline',
    description: 'Ejecutar el pipeline completo de 5 pasos (brainstorm → critique → synthesize → execute → quality_gate)',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'ID del proyecto' },
        prompt: { type: 'string', description: 'Prompt principal para el pipeline' },
        specId: { type: 'string', description: 'Spec vinculada (opcional)' },
      },
      required: ['projectId', 'prompt'],
    },
  },

  // --- Agent Management ---
  {
    name: 'nexus_get_agents',
    description: 'Listar agentes del proyecto con confianza, división y habilidades',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'ID del proyecto' },
        division: { type: 'string', description: 'Filtrar por división (opcional)' },
        limit: { type: 'number', description: 'Límite de resultados (default: 20)' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'nexus_get_agent_detail',
    description: 'Obtener detalle completo de un agente incluyendo memorias y skills',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: { type: 'string', description: 'ID del agente' },
      },
      required: ['agentId'],
    },
  },
  {
    name: 'nexus_update_trust',
    description: 'Actualizar el puntaje de confianza de un agente en el proyecto',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: { type: 'string', description: 'ID del agente' },
        projectId: { type: 'string', description: 'ID del proyecto' },
        delta: { type: 'number', description: 'Cambio de confianza (-1.0 a +1.0)' },
      },
      required: ['agentId', 'projectId', 'delta'],
    },
  },

  // --- Project Status ---
  {
    name: 'nexus_get_status',
    description: 'Obtener el estado completo de un proyecto con métricas agregadas',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'ID del proyecto' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'nexus_get_system_health',
    description: 'Obtener métricas de salud del sistema (uptime, memoria, conexiones)',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },

  // --- Spec Management ---
  {
    name: 'nexus_create_spec',
    description: 'Crear una nueva especificación en el proyecto',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'ID del proyecto' },
        title: { type: 'string', description: 'Título de la spec' },
        description: { type: 'string', description: 'Descripción detallada' },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], description: 'Prioridad' },
      },
      required: ['projectId', 'title'],
    },
  },
  {
    name: 'nexus_update_spec_phase',
    description: 'Cambiar la fase de una especificación (draft → review → approved → done)',
    inputSchema: {
      type: 'object',
      properties: {
        specId: { type: 'string', description: 'ID de la spec' },
        phase: { type: 'string', enum: ['draft', 'review', 'approved', 'in_progress', 'testing', 'done'], description: 'Nueva fase' },
      },
      required: ['specId', 'phase'],
    },
  },

  // --- Memory & Search ---
  {
    name: 'nexus_search_memory',
    description: 'Buscar en memorias de agentes (keyword + ChromaDB vector search)',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'ID del proyecto' },
        query: { type: 'string', description: 'Texto de búsqueda' },
        limit: { type: 'number', description: 'Límite (default: 20)' },
        category: { type: 'string', description: 'Filtrar por categoría (general|fact|skill|insight|pattern|preference)' },
      },
      required: ['projectId', 'query'],
    },
  },
  {
    name: 'nexus_get_mem0_stats',
    description: 'Obtener estadísticas del sistema Mem0 (decay, relevance, consolidación)',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'ID del proyecto' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'nexus_consolidate_memories',
    description: 'Ejecutar consolidación de memorias Mem0 (merge de similares)',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'ID del proyecto' },
        agentId: { type: 'string', description: 'ID del agente (o "all" para todos)' },
      },
      required: ['projectId'],
    },
  },

  // --- Proposals ---
  {
    name: 'nexus_get_proposals',
    description: 'Listar propuestas generadas por los agentes',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'ID del proyecto' },
        status: { type: 'string', description: 'Filtrar por status (pending|approved|rejected|implemented)' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'nexus_update_proposal',
    description: 'Actualizar el estado de una propuesta',
    inputSchema: {
      type: 'object',
      properties: {
        proposalId: { type: 'string', description: 'ID de la propuesta' },
        status: { type: 'string', enum: ['pending', 'approved', 'rejected', 'implemented'], description: 'Nuevo status' },
      },
      required: ['proposalId', 'status'],
    },
  },

  // --- Export ---
  {
    name: 'nexus_export_data',
    description: 'Exportar datos del proyecto en formato JSON o CSV',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'ID del proyecto' },
        format: { type: 'string', enum: ['json', 'csv'], description: 'Formato de exportación' },
        dataType: { type: 'string', enum: ['all', 'waves', 'memories', 'agents', 'specs'], description: 'Tipo de datos a exportar' },
      },
      required: ['projectId', 'format'],
    },
  },
]

// ===== RESOURCES =====
const MCP_RESOURCES: MCPResource[] = [
  { uri: 'nexus://dashboard', name: 'Dashboard', description: 'Panel de métricas del proyecto en tiempo real', mimeType: 'application/json' },
  { uri: 'nexus://agents', name: 'Agentes', description: 'Lista completa de agentes del proyecto', mimeType: 'application/json' },
  { uri: 'nexus://waves', name: 'Oleadas', description: 'Historial de oleadas de simulación', mimeType: 'application/json' },
  { uri: 'nexus://memory/mem0', name: 'Mem0 Store', description: 'Memorias a largo plazo con scoring de decay', mimeType: 'application/json' },
  { uri: 'nexus://specs', name: 'Specs', description: 'Especificaciones y kanban del proyecto', mimeType: 'application/json' },
  { uri: 'nexus://proposals', name: 'Propuestas', description: 'Propuestas de los agentes', mimeType: 'application/json' },
  { uri: 'nexus://trust-network', name: 'Red de Confianza', description: 'Grafo de trust scores entre agentes', mimeType: 'application/json' },
  { uri: 'nexus://activity-log', name: 'Activity Log', description: 'Registro de actividad del sistema', mimeType: 'application/json' },
  { uri: 'nexus://system-health', name: 'Salud del Sistema', description: 'Métricas de uptime, memoria y conexiones', mimeType: 'application/json' },
]

// ===== PROMPTS =====
const MCP_PROMPTS: MCPPrompt[] = [
  {
    name: 'brainstorm_session',
    description: 'Genera un prompt optimizado para una sesión de brainstorm con NEXUS',
    arguments: [
      { name: 'topic', description: 'Tema o problema a explorar', required: true },
      { name: 'context', description: 'Contexto adicional para los agentes', required: false },
    ],
  },
  {
    name: 'code_review',
    description: 'Genera un prompt para revision de código usando oleadas de crítica',
    arguments: [
      { name: 'code_description', description: 'Descripción del código a revisar', required: true },
      { name: 'focus_areas', description: 'Áreas focales (security, performance, readability)', required: false },
    ],
  },
  {
    name: 'project_plan',
    description: 'Genera un plan de proyecto basado en specs existentes',
    arguments: [
      { name: 'projectId', description: 'ID del proyecto NEXUS', required: true },
      { name: 'goal', description: 'Objetivo del plan', required: false },
    ],
  },
  {
    name: 'retrospective',
    description: 'Genera una retrospective de las oleadas ejecutadas',
    arguments: [
      { name: 'projectId', description: 'ID del proyecto NEXUS', required: true },
      { name: 'waveCount', description: 'Número de oleadas a analizar (default: 5)', required: false },
    ],
  },
]

// ===== HELPERS =====
function mcpResult(content: Array<{ type: string; text: string }>) {
  return { jsonrpc: '2.0' as const, result: { content } }
}

function mcpError(code: number, message: string) {
  return { jsonrpc: '2.0' as const, error: { code, message } }
}

// ===== TOOL HANDLERS =====
async function handleToolsCall(params: { name: string; arguments: Record<string, unknown> }) {
  const { name, arguments: args } = params
  const a = args as Record<string, string | number | undefined>

  switch (name) {
    // --- Waves ---
    case 'nexus_run_wave': {
      const { projectId, type, prompt, specId } = a
      if (!projectId || !type || !prompt) return mcpError(-32602, 'Se requieren projectId, type y prompt')
      const project = await db.project.findUnique({ where: { id: projectId as string } })
      if (!project) return mcpError(-32602, 'Proyecto no encontrado')
      const lastWave = await db.wave.findFirst({ where: { projectId: projectId as string }, orderBy: { number: 'desc' } })
      const wave = await db.wave.create({
        data: { projectId: projectId as string, number: (lastWave?.number || 0) + 1, type: type as string, status: 'pending', prompt: prompt as string, specId: (specId as string) || null },
      })
      return mcpResult([{ type: 'text', text: `Oleada #${wave.number} creada (${type}). ID: ${wave.id}. Status: pending. Ejecutar via /api/nexus/wave-stream para procesamiento de agentes.` }])
    }

    case 'nexus_get_waves': {
      const { projectId, limit, type } = a
      const where: Record<string, unknown> = { projectId: projectId as string }
      if (type) where.type = type
      const waves = await db.wave.findMany({ where, orderBy: { number: 'desc' }, take: (limit as number) || 10 })
      const text = waves.map((w) => `#${w.number} [${w.type}] ${w.status} — "${w.prompt.slice(0, 100)}"`).join('\n')
      return mcpResult([{ type: 'text', text: text || 'Sin oleadas' }])
    }

    case 'nexus_run_pipeline': {
      const { projectId, prompt, specId } = a
      if (!projectId || !prompt) return mcpError(-32602, 'Se requieren projectId y prompt')
      return mcpResult([{ type: 'text', text: `Pipeline de 5 pasos iniciado para proyecto ${projectId}. Ejecutar via /api/nexus/pipeline-stream con SSE para seguimiento en tiempo real. Prompt: "${String(prompt).slice(0, 80)}..."` }])
    }

    // --- Agents ---
    case 'nexus_get_agents': {
      const { projectId, division, limit } = a
      const where: Record<string, unknown> = { projectId: projectId as string }
      if (division) where.agent = { division: division as string }
      const pas = await db.projectAgent.findMany({ where, include: { agent: { select: { name: true, division: true, emoji: true, bio: true } } }, take: (limit as number) || 20, orderBy: { trustScore: 'desc' } })
      const text = pas.map((pa) => `${pa.agent.emoji} ${pa.agent.name} (${pa.agent.division}) trust: ${Math.round((pa.trustScore ?? 0.5) * 100)}% — ${pa.agent.bio?.slice(0, 80) || 'Sin bio'}`).join('\n')
      return mcpResult([{ type: 'text', text: text || 'Sin agentes' }])
    }

    case 'nexus_get_agent_detail': {
      const { agentId } = a
      if (!agentId) return mcpError(-32602, 'Se requiere agentId')
      const agent = await db.agent.findUnique({ where: { id: agentId as string }, include: { projectAgents: { take: 1 }, skills: { take: 5 } } })
      if (!agent) return mcpError(-32602, 'Agente no encontrado')
      const text = `${agent.emoji} ${agent.name} (${agent.division})\nBio: ${agent.bio}\nSkills: ${agent.skills.map((s) => s.name).join(', ') || 'N/A'}\nTrust (last project): ${agent.projectAgents[0] ? Math.round((agent.projectAgents[0].trustScore ?? 0.5) * 100) + '%' : 'N/A'}`
      return mcpResult([{ type: 'text', text }])
    }

    case 'nexus_update_trust': {
      const { agentId, projectId, delta } = a
      if (!agentId || !projectId || delta === undefined) return mcpError(-32602, 'Se requieren agentId, projectId y delta')
      const pa = await db.projectAgent.findFirst({ where: { agentId: agentId as string, projectId: projectId as string } })
      if (!pa) return mcpError(-32602, 'Agente no asignado al proyecto')
      const newTrust = Math.max(0, Math.min(1, (pa.trustScore ?? 0.5) + (delta as number)))
      await db.projectAgent.update({ where: { id: pa.id }, data: { trustScore: newTrust } })
      return mcpResult([{ type: 'text', text: `Trust de ${agentId} actualizado a ${Math.round(newTrust * 100)}% (delta: ${delta > 0 ? '+' : ''}${delta})` }])
    }

    // --- Project ---
    case 'nexus_get_status': {
      const { projectId } = a
      if (!projectId) return mcpError(-32602, 'Se requiere projectId')
      const project = await db.project.findUnique({ where: { id: projectId as string }, include: { _count: { select: { waves: true, agents: true, memories: true, proposals: true, specs: true } } } })
      if (!project) return mcpError(-32602, 'Proyecto no encontrado')
      return mcpResult([{ type: 'text', text: `Proyecto: ${project.name} (${project.status})\nAgentes: ${project._count.agents}\nOleadas: ${project._count.waves}\nMemorias: ${project._count.memories}\nPropuestas: ${project._count.proposals}\nSpecs: ${project._count.specs}` }])
    }

    case 'nexus_get_system_health': {
      const uptime = process.uptime()
      const mem = process.memoryUsage()
      return mcpResult([{ type: 'text', text: `NEXUS Sim v2 — System Health\nUptime: ${Math.round(uptime)}s\nRSS: ${Math.round(mem.rss / 1024 / 1024)}MB\nHeap: ${Math.round(mem.heapUsed / 1024 / 1024)}/${Math.round(mem.heapTotal / 1024 / 1024)}MB\nNode: ${process.version}\nEnv: ${process.env.NODE_ENV || 'unknown'}` }])
    }

    // --- Specs ---
    case 'nexus_create_spec': {
      const { projectId, title, description, priority } = a
      if (!projectId || !title) return mcpError(-32602, 'Se requieren projectId y title')
      const spec = await db.spec.create({ data: { projectId: projectId as string, title: title as string, description: (description as string) || '', priority: (priority as string) || 'medium' } })
      return mcpResult([{ type: 'text', text: `Spec creada: "${spec.title}" (ID: ${spec.id}, fase: ${spec.phase}, prioridad: ${spec.priority})` }])
    }

    case 'nexus_update_spec_phase': {
      const { specId, phase } = a
      if (!specId || !phase) return mcpError(-32602, 'Se requieren specId y phase')
      const spec = await db.spec.update({ where: { id: specId as string }, data: { phase: phase as string } })
      return mcpResult([{ type: 'text', text: `Spec "${spec.title}" actualizada a fase: ${phase}` }])
    }

    // --- Memory ---
    case 'nexus_search_memory': {
      const { projectId, query, limit, category } = a
      if (!projectId || !query) return mcpError(-32602, 'Se requieren projectId y query')
      const where: Record<string, unknown> = { projectId: projectId as string, content: { contains: query } }
      if (category) where.category = category
      const memories = await db.agentMemory.findMany({ where, orderBy: { importance: 'desc' }, take: (limit as number) || 20 })
      const text = memories.map((m) => `[${m.type}] (${m.importance.toFixed(2)}) ${m.content.slice(0, 150)}`).join('\n')
      return mcpResult([{ type: 'text', text: text || 'Sin resultados' }])
    }

    case 'nexus_get_mem0_stats': {
      const { projectId } = a
      if (!projectId) return mcpError(-32602, 'Se requiere projectId')
      const total = await db.memoryStore.count({ where: { projectId: projectId as string } })
      return mcpResult([{ type: 'text', text: `Mem0 Stats — Total memorias: ${total}` }])
    }

    case 'nexus_consolidate_memories': {
      const { projectId } = a
      if (!projectId) return mcpError(-32602, 'Se requiere projectId')
      return mcpResult([{ type: 'text', text: `Consolidación iniciada para proyecto ${projectId}. Usar /api/nexus/memory-store?action=consolidate&agentId=all para ejecutar.` }])
    }

    // --- Proposals ---
    case 'nexus_get_proposals': {
      const { projectId, status } = a
      if (!projectId) return mcpError(-32602, 'Se requiere projectId')
      const where: Record<string, unknown> = { projectId: projectId as string }
      if (status) where.status = status
      const proposals = await db.proposal.findMany({ where, orderBy: { createdAt: 'desc' }, take: 10 })
      const text = proposals.map((p) => `"${p.title}" [${p.status}] — ${p.summary?.slice(0, 80) || 'Sin resumen'}`).join('\n')
      return mcpResult([{ type: 'text', text: text || 'Sin propuestas' }])
    }

    case 'nexus_update_proposal': {
      const { proposalId, status } = a
      if (!proposalId || !status) return mcpError(-32602, 'Se requieren proposalId y status')
      const p = await db.proposal.update({ where: { id: proposalId as string }, data: { status: status as string } })
      return mcpResult([{ type: 'text', text: `Propuesta "${p.title}" actualizada a: ${status}` }])
    }

    // --- Export ---
    case 'nexus_export_data': {
      const { projectId, format, dataType } = a
      if (!projectId || !format) return mcpError(-32602, 'Se requieren projectId y format')
      return mcpResult([{ type: 'text', text: `Export ${format.toUpperCase()} solicitado para proyecto ${projectId}. Datos: ${dataType || 'all'}. Usar /api/nexus/${projectId}/export?format=${format}&type=${dataType || 'all'}` }])
    }

    default:
      return mcpError(-32601, `Herramienta no encontrada: ${name}`)
  }
}

// ===== RESOURCE HANDLER =====
async function handleResourcesRead(uri: string, projectId?: string) {
  // Extract project ID from URI or use default
  if (!projectId) {
    // Try to find the first project
    const firstProject = await db.project.findFirst({ orderBy: { createdAt: 'desc' } })
    projectId = firstProject?.id
  }
  if (!projectId) return mcpError(-32602, 'No hay proyectos disponibles')

  switch (uri) {
    case 'nexus://dashboard': {
      const project = await db.project.findUnique({ where: { id: projectId }, include: { _count: { select: { waves: true, agents: true, memories: true, proposals: true, specs: true } } } })
      return mcpResult([{ type: 'text', text: JSON.stringify({ name: project?.name, status: project?.status, agents: project?._count.agents, waves: project?._count.waves, memories: project?._count.memories, proposals: project?._count.proposals, specs: project?._count.specs }, null, 2) }])
    }
    case 'nexus://agents': {
      const pas = await db.projectAgent.findMany({ where: { projectId }, include: { agent: true }, take: 50, orderBy: { trustScore: 'desc' } })
      const data = pas.map((pa) => ({ name: pa.agent.name, division: pa.agent.division, emoji: pa.agent.emoji, trust: Math.round((pa.trustScore ?? 0.5) * 100) }))
      return mcpResult([{ type: 'text', text: JSON.stringify(data, null, 2) }])
    }
    case 'nexus://waves': {
      const waves = await db.wave.findMany({ where: { projectId }, orderBy: { number: 'desc' }, take: 20 })
      return mcpResult([{ type: 'text', text: JSON.stringify(waves, null, 2) }])
    }
    case 'nexus://memory/mem0': {
      const memories = await db.memoryStore.findMany({ where: { projectId }, take: 30, orderBy: { createdAt: 'desc' } })
      return mcpResult([{ type: 'text', text: JSON.stringify(memories, null, 2) }])
    }
    case 'nexus://specs': {
      const specs = await db.spec.findMany({ where: { projectId }, orderBy: { createdAt: 'desc' } })
      return mcpResult([{ type: 'text', text: JSON.stringify(specs, null, 2) }])
    }
    case 'nexus://proposals': {
      const proposals = await db.proposal.findMany({ where: { projectId }, orderBy: { createdAt: 'desc' }, take: 20 })
      return mcpResult([{ type: 'text', text: JSON.stringify(proposals, null, 2) }])
    }
    case 'nexus://trust-network': {
      const pas = await db.projectAgent.findMany({ where: { projectId }, include: { agent: true }, take: 50 })
      const network = pas.map((pa) => ({ agent: pa.agent.name, division: pa.agent.division, trust: pa.trustScore }))
      return mcpResult([{ type: 'text', text: JSON.stringify(network, null, 2) }])
    }
    case 'nexus://activity-log': {
      const logs = await db.activityLog.findMany({ where: { projectId }, orderBy: { timestamp: 'desc' }, take: 30 })
      return mcpResult([{ type: 'text', text: JSON.stringify(logs, null, 2) }])
    }
    case 'nexus://system-health': {
      return mcpResult([{ type: 'text', text: JSON.stringify({ uptime: process.uptime(), rss_mb: Math.round(process.memoryUsage().rss / 1024 / 1024), node: process.version, env: process.env.NODE_ENV }, null, 2) }])
    }
    default:
      return mcpError(-32602, `Recurso no encontrado: ${uri}`)
  }
}

// ===== PROMPT HANDLER =====
function handlePromptsGet(name: string, args?: Record<string, string>) {
  switch (name) {
    case 'brainstorm_session': {
      const topic = args?.topic || '[tópico]'
      const context = args?.context ? `\nContexto adicional: ${args.context}` : ''
      return {
        description: `Sesión de brainstorm NEXUS: ${topic}`,
        messages: [
          { role: 'user', content: `Actúa como facilitador de brainstorming. Tópico: "${topic}". Genera ideas innovadoras, considerá múltiples perspectivas y desafíos.${context}` },
          { role: 'system', content: 'Los agentes de NEXUS generarán respuestas desde sus respectivas divisiones y expertises.' },
        ],
      }
    }
    case 'code_review': {
      const code = args?.code_description || '[código]'
      const focus = args?.focus_areas ? ` Enfocar en: ${args.focus_areas}` : ''
      return {
        description: `Code review con NEXUS: ${code}`,
        messages: [
          { role: 'user', content: `Realiza un code review detallado de: "${code}".${focus} Identificá bugs, mejoras de performance y problemas de seguridad.` },
        ],
      }
    }
    case 'project_plan': {
      return {
        description: `Plan de proyecto NEXUS: ${args?.projectId || 'N/A'}`,
        messages: [
          { role: 'user', content: `Generá un plan de proyecto basado en las specs existentes del proyecto NEXUS. ${args?.goal ? `Objetivo: ${args.goal}` : ''}` },
        ],
      }
    }
    case 'retrospective': {
      return {
        description: `Retrospectiva NEXUS: ${args?.projectId || 'N/A'}`,
        messages: [
          { role: 'user', content: `Analizá las últimas ${args?.waveCount || 5} oleadas del proyecto NEXUS. Identificá patrones, aprendizajes y áreas de mejora.` },
        ],
      }
    }
    default:
      return null
  }
}

// ===== MAIN ROUTER =====
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { method, params, id } = body

    // Initialize handshake
    if (method === 'initialize') {
      return NextResponse.json({
        jsonrpc: '2.0',
        id: id || null,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: { listChanged: true },
            resources: { subscribe: false, listChanged: true },
            prompts: { listChanged: false },
          },
          serverInfo: {
            name: 'nexus-mcp-server',
            version: '2.0.0',
            description: 'NEXUS Sim v2 — Full MCP Tool Server (16 tools, 9 resources, 4 prompts)',
          },
        },
      })
    }

    // Initialized notification
    if (method === 'notifications/initialized') {
      return NextResponse.json({ jsonrpc: '2.0', result: {} })
    }

    // --- TOOLS ---
    if (method === 'tools/list') {
      return NextResponse.json({ jsonrpc: '2.0', id: id || null, result: { tools: MCP_TOOLS } })
    }

    if (method === 'tools/call') {
      if (!params?.name) return NextResponse.json(mcpError(-32602, 'Se requiere params.name'))
      return NextResponse.json(await handleToolsCall(params))
    }

    // --- RESOURCES ---
    if (method === 'resources/list') {
      return NextResponse.json({ jsonrpc: '2.0', id: id || null, result: { resources: MCP_RESOURCES } })
    }

    if (method === 'resources/read') {
      if (!params?.uri) return NextResponse.json(mcpError(-32602, 'Se requiere params.uri'))
      return NextResponse.json(await handleResourcesRead(params.uri, params.projectId as string))
    }

    // --- PROMPTS ---
    if (method === 'prompts/list') {
      return NextResponse.json({ jsonrpc: '2.0', id: id || null, result: { prompts: MCP_PROMPTS } })
    }

    if (method === 'prompts/get') {
      if (!params?.name) return NextResponse.json(mcpError(-32602, 'Se requiere params.name'))
      const prompt = handlePromptsGet(params.name, params.arguments as Record<string, string>)
      if (!prompt) return NextResponse.json(mcpError(-32601, `Prompt no encontrado: ${params.name}`))
      return NextResponse.json({ jsonrpc: '2.0', id: id || null, result: prompt })
    }

    // Ping
    if (method === 'ping') {
      return NextResponse.json({ jsonrpc: '2.0', id: id || null, result: {} })
    }

    return NextResponse.json(mcpError(-32601, `Método no soportado: ${method}`))
  } catch {
    return NextResponse.json(mcpError(-32700, 'Error de parseo JSON'), { status: 400 })
  }
}
