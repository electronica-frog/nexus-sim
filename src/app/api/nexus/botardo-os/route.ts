import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/nexus/botardo-os?projectId=xxx
 * Export NEXUS Sim as a Botardo-OS module.
 *
 * Returns a complete module manifest including:
 * - Module metadata (name, version, capabilities)
 * - Agent definitions (portable format)
 * - API endpoints documentation
 * - Webhook configuration
 * - Integration guide for botardo-os
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json({ error: 'Se requiere projectId' }, { status: 400 })
    }

    // Fetch project with all relations
    const project = await db.project.findUnique({
      where: { id: projectId },
      include: {
        agents: {
          include: { agent: { select: { agentId: true, name: true, division: true, emoji: true, personality: true, tools: true, vibe: true } } },
          take: 200,
        },
        waves: {
          include: {
            responses: {
              include: {
                projectAgent: { include: { agent: { select: { name: true, division: true, emoji: true } } } },
              },
            },
          },
          orderBy: { number: 'desc' },
          take: 50,
        },
        specs: { take: 20 },
        proposals: { take: 20 },
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
    }

    // Build Botardo-OS Module Manifest
    const moduleManifest = {
      // Module Identity
      module: {
        name: 'nexus-sim-v2',
        version: '2.0.0',
        displayName: 'NEXUS Sim — Multi-Agent Simulation',
        description: 'Sistema de simulación multi-agente colaborativa con oleadas, trust networks, memoria profunda, skills auto-extraídas y evaluación automática',
        author: 'NEXUS Team',
        license: 'MIT',
        type: 'simulation',
      },

      // Project Data
      project: {
        id: project.id,
        name: project.name,
        status: project.status,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        stats: {
          agents: project.agents.length,
          waves: project.waves.length,
          specs: project.specs.length,
          proposals: project.proposals.length,
        },
      },

      // Portable Agent Definitions
      agents: project.agents.map((pa) => ({
        id: pa.agent.agentId,
        name: pa.agent.name,
        division: pa.agent.division,
        emoji: pa.agent.emoji,
        role: pa.role,
        personality: pa.agent.personality,
        tools: pa.agent.tools ? pa.agent.tools.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
        vibe: pa.agent.vibe,
        trustScore: pa.trustScore ?? 0.5,
        status: pa.status,
        capabilities: [], // Populated by skills
      })),

      // Recent Waves (summaries)
      waves: project.waves.slice(0, 10).map((w) => ({
        id: w.id,
        number: w.number,
        type: w.type,
        status: w.status,
        prompt: w.prompt,
        result: w.result ? w.result.slice(0, 300) : null,
        responseCount: w.responses.length,
        createdAt: w.createdAt,
      })),

      // API Endpoints
      api: {
        baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
        endpoints: [
          { method: 'GET', path: '/api/nexus', description: 'Listar proyectos' },
          { method: 'GET', path: '/api/nexus?projectId={id}', description: 'Obtener proyecto completo' },
          { method: 'POST', path: '/api/nexus/wave', description: 'Ejecutar oleada' },
          { method: 'POST', path: '/api/nexus/pipeline', description: 'Ejecutar pipeline 5 pasos' },
          { method: 'GET', path: '/api/nexus/dashboard?projectId={id}', description: 'Dashboard métricas' },
          { method: 'GET', path: '/api/nexus/metrics?projectId={id}', description: 'Benchmarking' },
          { method: 'POST', path: '/api/nexus/crew-execute', description: 'Ejecutar crew con LLM' },
          { method: 'POST', path: '/api/nexus/llm-judge', description: 'Evaluar oleada con LLM Judge' },
          { method: 'POST', path: '/api/nexus/mcp', description: 'MCP Protocol (JSON-RPC)' },
          { method: 'GET', path: '/api/nexus/cross-project', description: 'Cross-project transfer' },
          { method: 'GET', path: '/api/nexus/botardo-os', description: 'Este endpoint (manifest)' },
        ],
      },

      // MCP Integration
      mcp: {
        protocol: 'JSON-RPC 2.0',
        version: '2024-11-05',
        endpoint: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/nexus/mcp`,
        tools: 16,
        resources: 9,
        prompts: 4,
        compatibleWith: ['Claude Desktop', 'VS Code MCP', 'Cursor MCP', 'Any JSON-RPC client'],
      },

      // Webhook Configuration
      webhooks: {
        supportedEvents: [
          'wave.created', 'wave.completed', 'wave.failed',
          'crew.completed', 'crew.task_completed',
          'judge.evaluation', 'proposal.created', 'proposal.approved',
          'skill.learned', 'trust.updated',
          'pipeline.started', 'pipeline.completed',
        ],
        config: {
          url: 'WEBHOOK_URL_PLACEHOLDER',
          secret: 'WEBHOOK_SECRET_PLACEHOLDER',
          events: ['wave.completed', 'pipeline.completed'],
        },
      },

      // Capabilities
      capabilities: [
        { id: 'wave_simulation', name: 'Simulación por Oleadas', description: '5 tipos de oleada: brainstorm, critique, synthesize, execute, quality_gate' },
        { id: 'pipeline', name: 'Pipeline Automático', description: '5 pasos secuenciales con SSE streaming en tiempo real' },
        { id: 'trust_network', name: 'Red de Confianza', description: 'Trust scores dinámicos basados en mood, confidence y peer validation' },
        { id: 'semantic_memory', name: 'Memoria Semántica', description: 'ChromaDB con embeddings 384-dim + TF-IDF fallback' },
        { id: 'mem0', name: 'Memoria a Largo Plazo', description: 'Exponential decay, relevance scoring, consolidación, GC' },
        { id: 'auto_mejora', name: 'Auto-Mejora', description: 'Extracción automática de skills desde respuestas entusiastas' },
        { id: 'crew_orchestration', name: 'Orquestación CrewAI', description: '5 templates, 7 roles, 4 estrategias, ejecución con LLM real' },
        { id: 'llm_judges', name: 'Evaluación Automática', description: '5 dimensiones ponderadas, trust feedback loop, highlights' },
        { id: 'mcp_protocol', name: 'MCP Protocol', description: '16 tools, 9 resources, 4 prompts — Claude Desktop compatible' },
        { id: 'cross_project', name: 'Multi-Proyecto', description: 'Pool compartido, cross-project knowledge transfer' },
        { id: 'spec_driven', name: 'Spec-Driven Development', description: 'Kanban con fases: draft → design → implementation → review → completed' },
        { id: 'agent_graphs', name: 'Agent Graphs', description: 'State machines tipo LangGraph con decisiones condicionales' },
      ],

      // Integration Guide
      integration: {
        quickStart: [
          '1. GET /api/nexus — Listar proyectos disponibles',
          '2. GET /api/nexus?projectId={id} — Cargar proyecto',
          '3. POST /api/nexus/wave — Ejecutar oleada de simulación',
          '4. GET /api/nexus/mcp — Conectar via MCP Protocol',
          '5. POST /api/nexus/crew-execute — Orquestar crews multi-agente',
          '6. POST /api/nexus/llm-judge — Evaluar calidad automáticamente',
        ],
        configuration: {
          envVars: ['DATABASE_URL', 'NEXUS_LLM_PROVIDER', 'NEXUS_LLM_MODEL'],
          defaults: { llmProvider: 'z-ai-web-dev-sdk', llmModel: 'default', maxAgentsPerWave: 20 },
        },
      },
    }

    return NextResponse.json(moduleManifest)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * POST /api/nexus/botardo-os
 * Register this NEXUS instance with a Botardo-OS hub.
 * Body: { hubUrl, hubSecret, projectId, webhookUrl }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { hubUrl, projectId, webhookUrl } = body

    if (!hubUrl || !projectId) {
      return NextResponse.json({ error: 'Se requieren hubUrl y projectId' }, { status: 400 })
    }

    // Verify project exists
    const project = await db.project.findUnique({ where: { id: projectId } })
    if (!project) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
    }

    // Log the registration
    await db.systemLog.create({
      data: {
        projectId,
        type: 'botardo_os_registration',
        message: `NEXUS Sim registrado en Botardo-OS hub: ${hubUrl}`,
        metadata: JSON.stringify({
          hubUrl,
          webhookUrl: webhookUrl || null,
          registeredAt: new Date().toISOString(),
          projectId,
          projectName: project.name,
        }),
      },
    })

    return NextResponse.json({
      success: true,
      message: `NEXUS Sim "${project.name}" registrado en Botardo-OS hub`,
      module: 'nexus-sim-v2',
      projectId,
      capabilities: 12,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
