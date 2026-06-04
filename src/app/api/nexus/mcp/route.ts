import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// MCP-compatible tools endpoint
// Implements simplified JSON-RPC style requests compatible with MCP tool-calling patterns

interface MCPTool {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
}

const MCP_TOOLS: MCPTool[] = [
  {
    name: 'nexus_run_wave',
    description: 'Ejecutar una oleada en el sistema NEXUS con agentes seleccionados',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'ID del proyecto' },
        type: { type: 'string', enum: ['brainstorm', 'critique', 'synthesize', 'execute', 'quality_gate'], description: 'Tipo de oleada' },
        prompt: { type: 'string', description: 'Prompt/problema para los agentes' },
        specId: { type: 'string', description: 'ID opcional de la spec vinculada' },
      },
      required: ['projectId', 'type', 'prompt'],
    },
  },
  {
    name: 'nexus_get_status',
    description: 'Obtener el estado completo de un proyecto NEXUS',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'ID del proyecto' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'nexus_get_agents',
    description: 'Listar los agentes asignados a un proyecto',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'ID del proyecto' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'nexus_get_waves',
    description: 'Listar las oleadas de un proyecto',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'ID del proyecto' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'nexus_create_spec',
    description: 'Crear una nueva especificación (Spec) en el proyecto',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'ID del proyecto' },
        title: { type: 'string', description: 'Título de la especificación' },
        description: { type: 'string', description: 'Descripción detallada' },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], description: 'Prioridad' },
      },
      required: ['projectId', 'title'],
    },
  },
  {
    name: 'nexus_search_memory',
    description: 'Buscar en las memorias de los agentes del proyecto',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'ID del proyecto' },
        query: { type: 'string', description: 'Texto de búsqueda' },
        limit: { type: 'number', description: 'Límite de resultados (por defecto 20)' },
      },
      required: ['projectId', 'query'],
    },
  },
]

// Handle tools/list
function handleToolsList() {
  return NextResponse.json({
    jsonrpc: '2.0',
    id: null,
    result: {
      tools: MCP_TOOLS,
    },
  })
}

// Handle tools/call
async function handleToolsCall(params: { name: string; arguments: Record<string, unknown> }) {
  const { name, arguments: args } = params

  try {
    switch (name) {
      case 'nexus_run_wave': {
        const { projectId, type, prompt, specId } = args as { projectId: string; type: string; prompt: string; specId?: string }
        if (!projectId || !type || !prompt) {
          return NextResponse.json({ jsonrpc: '2.0', error: { code: -32602, message: 'Parámetros inválidos: se requieren projectId, type y prompt' } })
        }

        // Find or create project
        const project = await db.project.findUnique({ where: { id: projectId } })
        if (!project) {
          return NextResponse.json({ jsonrpc: '2.0', error: { code: -32602, message: 'Proyecto no encontrado' } })
        }

        // For MCP, we trigger the wave via the internal API
        // In a full implementation, this would be async with SSE
        const lastWave = await db.wave.findFirst({
          where: { projectId },
          orderBy: { number: 'desc' },
        })
        const waveNumber = (lastWave?.number || 0) + 1

        const wave = await db.wave.create({
          data: { projectId, number: waveNumber, type, status: 'pending', prompt, specId: specId || null },
        })

        return NextResponse.json({
          jsonrpc: '2.0',
          result: {
            content: [{ type: 'text', text: `Oleada #${waveNumber} creada (${type}). ID: ${wave.id}. Nota: La ejecución de agentes requiere el endpoint de streaming.` }],
          },
        })
      }

      case 'nexus_get_status': {
        const { projectId } = args as { projectId: string }
        const project = await db.project.findUnique({
          where: { id: projectId },
          include: {
            _count: { select: { waves: true, agents: true, memories: true, proposals: true, specs: true } },
          },
        })
        if (!project) {
          return NextResponse.json({ jsonrpc: '2.0', error: { code: -32602, message: 'Proyecto no encontrado' } })
        }
        return NextResponse.json({
          jsonrpc: '2.0',
          result: {
            content: [{
              type: 'text',
              text: `Proyecto: ${project.name} (${project.status})\nAgentes: ${project._count.agents}\nOleadas: ${project._count.waves}\nMemorias: ${project._count.memories}\nPropuestas: ${project._count.proposals}\nEspecificaciones: ${project._count.specs}`,
            }],
          },
        })
      }

      case 'nexus_get_agents': {
        const { projectId } = args as { projectId: string }
        const projectAgents = await db.projectAgent.findMany({
          where: { projectId },
          include: { agent: { select: { name: true, division: true, emoji: true } } },
          take: 20,
        })
        const agentList = projectAgents.map((pa) => `${pa.agent.emoji} ${pa.agent.name} (${pa.agent.division}) [confianza: ${Math.round((pa.trustScore ?? 0.5) * 100)}%]`).join('\n')
        return NextResponse.json({
          jsonrpc: '2.0',
          result: {
            content: [{ type: 'text', text: agentList || 'No hay agentes disponibles' }],
          },
        })
      }

      case 'nexus_get_waves': {
        const { projectId } = args as { projectId: string }
        const waves = await db.wave.findMany({
          where: { projectId },
          orderBy: { number: 'desc' },
          take: 10,
        })
        const waveList = waves.map((w) => `#${w.number} [${w.type}] ${w.status} — "${w.prompt.slice(0, 80)}..."`).join('\n')
        return NextResponse.json({
          jsonrpc: '2.0',
          result: {
            content: [{ type: 'text', text: waveList || 'No hay oleadas' }],
          },
        })
      }

      case 'nexus_create_spec': {
        const { projectId, title, description, priority } = args as { projectId: string; title: string; description?: string; priority?: string }
        if (!projectId || !title) {
          return NextResponse.json({ jsonrpc: '2.0', error: { code: -32602, message: 'Se requieren projectId y title' } })
        }
        const spec = await db.spec.create({
          data: { projectId, title, description: description || '', priority: priority || 'medium' },
        })
        return NextResponse.json({
          jsonrpc: '2.0',
          result: {
            content: [{ type: 'text', text: `Spec creada: "${spec.title}" (ID: ${spec.id}, fase: ${spec.phase}, prioridad: ${spec.priority})` }],
          },
        })
      }

      case 'nexus_search_memory': {
        const { projectId, query, limit } = args as { projectId: string; query: string; limit?: number }
        if (!projectId || !query) {
          return NextResponse.json({ jsonrpc: '2.0', error: { code: -32602, message: 'Se requieren projectId y query' } })
        }
        const memories = await db.agentMemory.findMany({
          where: { projectId, content: { contains: query } },
          orderBy: { importance: 'desc' },
          take: limit || 20,
        })
        const results = memories.map((m) => `[${m.type}] (${m.importance.toFixed(2)}) ${m.content.slice(0, 150)}`).join('\n')
        return NextResponse.json({
          jsonrpc: '2.0',
          result: {
            content: [{ type: 'text', text: results || 'Sin resultados' }],
          },
        })
      }

      default:
        return NextResponse.json({
          jsonrpc: '2.0',
          error: { code: -32601, message: `Herramienta no encontrada: ${name}` },
        })
    }
  } catch (error) {
    return NextResponse.json({
      jsonrpc: '2.0',
      error: { code: -32603, message: `Error interno: ${String(error)}` },
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { method, params, id } = body

    if (method === 'tools/list') {
      return handleToolsList()
    }

    if (method === 'tools/call') {
      if (!params || !params.name) {
        return NextResponse.json({
          jsonrpc: '2.0',
          error: { code: -32602, message: 'Parámetros inválidos: se requiere params.name' },
        })
      }
      return handleToolsCall(params)
    }

    if (method === 'initialize') {
      return NextResponse.json({
        jsonrpc: '2.0',
        id: id || null,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'nexus-mcp', version: '1.0.0' },
        },
      })
    }

    return NextResponse.json({
      jsonrpc: '2.0',
      error: { code: -32601, message: `Método no soportado: ${method}` },
    })
  } catch {
    return NextResponse.json({
      jsonrpc: '2.0',
      error: { code: -32700, message: 'Error de parseo JSON' },
    }, { status: 400 })
  }
}
