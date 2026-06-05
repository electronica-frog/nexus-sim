/**
 * Agent Orchestrator — NEXUS Sim v2
 *
 * Implements CrewAI/AutoGen-style orchestration natively in TypeScript:
 * - Crews: groups of agents with defined roles and hierarchy
 * - Tasks: sequential or parallel work items with dependencies
 * - Delegation: agents can hand off work to specialists
 * - Human-in-the-loop: checkpoints for approval
 * - Multi-turn conversations: agent chains with context passing
 *
 * Architecture:
 *   Orchestrator → Crew → Tasks → Agents → LLM → Results
 *                              ↓
 *                        Context passing
 *                              ↓
 *                        Next task
 */

export interface OrchestratorAgent {
  id: string
  name: string
  role: 'leader' | 'researcher' | 'writer' | 'reviewer' | 'coder' | 'analyst' | 'executor'
  division?: string
  capabilities: string[]
  maxTokens?: number
  temperature?: number
}

export interface OrchestratorTask {
  id: string
  crewId: string
  type: 'sequential' | 'parallel' | 'delegation' | 'review' | 'synthesis'
  description: string
  assigneeRole: string
  dependsOn?: string[]
  input?: Record<string, unknown>
  requireApproval?: boolean
  status: 'pending' | 'running' | 'completed' | 'failed' | 'waiting_approval'
  result?: string
  tokensUsed?: number
  startedAt?: string
  completedAt?: string
}

export interface OrchestratorCrew {
  id: string
  name: string
  description: string
  projectId: string
  agents: OrchestratorAgent[]
  tasks: OrchestratorTask[]
  strategy: 'sequential' | 'hierarchical' | 'parallel' | 'delegative'
  maxTurns: number
  status: 'draft' | 'running' | 'completed' | 'failed' | 'paused'
  context: Record<string, unknown>
  createdAt: string
  completedAt?: string
}

export interface CrewTemplate {
  id: string
  name: string
  description: string
  strategy: OrchestratorCrew['strategy']
  roles: OrchestratorAgent['role'][]
  defaultMaxTurns: number
  taskTypes: OrchestratorTask['type'][]
}

// ===== BUILT-IN CREW TEMPLATES =====
export const CREW_TEMPLATES: CrewTemplate[] = [
  {
    id: 'research-write',
    name: 'Research & Write',
    description: 'Un equipo de investigación que recopila información y produce un documento final',
    strategy: 'sequential',
    roles: ['leader', 'researcher', 'writer', 'reviewer'],
    defaultMaxTurns: 6,
    taskTypes: ['sequential', 'review'],
  },
  {
    id: 'code-development',
    name: 'Code Development',
    description: 'Ciclo completo de desarrollo: diseño, implementación, revisión',
    strategy: 'hierarchical',
    roles: ['leader', 'analyst', 'coder', 'reviewer'],
    defaultMaxTurns: 8,
    taskTypes: ['sequential', 'delegation', 'review'],
  },
  {
    id: 'brainstorm-critique',
    name: 'Brainstorm & Critique',
    description: 'Generación de ideas seguida de evaluación crítica',
    strategy: 'parallel',
    roles: ['leader', 'researcher', 'analyst'],
    defaultMaxTurns: 4,
    taskTypes: ['parallel', 'synthesis'],
  },
  {
    id: 'analysis-report',
    name: 'Analysis Report',
    description: 'Análisis profundo con generación de informe multi-sección',
    strategy: 'sequential',
    roles: ['analyst', 'researcher', 'writer', 'reviewer'],
    defaultMaxTurns: 6,
    taskTypes: ['sequential', 'synthesis', 'review'],
  },
  {
    id: 'auto-pilot',
    name: 'Auto-Pilot',
    description: 'Delegación automática: el líder distribuye trabajo y sintetiza resultados',
    strategy: 'delegative',
    roles: ['leader', 'executor', 'researcher', 'writer'],
    defaultMaxTurns: 10,
    taskTypes: ['delegation', 'sequential', 'synthesis'],
  },
]

// ===== CREW BUILDER =====

/**
 * Create a new crew from a template with project-specific agents.
 */
export function createCrewFromTemplate(
  templateId: string,
  projectId: string,
  projectAgents: Array<{ id: string; name: string; division: string; emoji: string; trustScore?: number | null }>,
  objective: string,
): OrchestratorCrew | null {
  const template = CREW_TEMPLATES.find((t) => t.id === templateId)
  if (!template) return null

  // Map project agents to crew roles by division/skill matching
  const agents = template.roles.map((role, index) => {
    const candidate = projectAgents[index % projectAgents.length]
    return {
      id: candidate.id,
      name: candidate.name,
      role,
      division: candidate.division,
      capabilities: getRoleCapabilities(role),
      maxTokens: role === 'writer' ? 2000 : 1500,
      temperature: role === 'researcher' ? 0.8 : 0.6,
    }
  })

  // Auto-generate tasks based on template
  const tasks = generateTasksForTemplate(template, objective, agents)

  return {
    id: `crew-${Date.now()}`,
    name: template.name,
    description: `${template.description} — ${objective.slice(0, 80)}`,
    projectId,
    agents,
    tasks,
    strategy: template.strategy,
    maxTurns: template.defaultMaxTurns,
    status: 'draft',
    context: { objective, templateId },
    createdAt: new Date().toISOString(),
  }
}

function getRoleCapabilities(role: OrchestratorAgent['role']): string[] {
  const map: Record<string, string[]> = {
    leader: ['planning', 'delegation', 'synthesis', 'decision-making'],
    researcher: ['search', 'analysis', 'fact-checking', 'summarization'],
    writer: ['drafting', 'editing', 'formatting', 'storytelling'],
    reviewer: ['critique', 'quality-assurance', 'fact-checking', 'feedback'],
    coder: ['implementation', 'debugging', 'architecture', 'optimization'],
    analyst: ['data-analysis', 'pattern-recognition', 'evaluation', 'metrics'],
    executor: ['implementation', 'execution', 'iteration', 'testing'],
  }
  return map[role] || ['general']
}

function generateTasksForTemplate(
  template: CrewTemplate,
  objective: string,
  agents: OrchestratorAgent[],
): OrchestratorTask[] {
  const tasks: OrchestratorTask[] = []
  const leader = agents.find((a) => a.role === 'leader') || agents[0]

  switch (template.strategy) {
    case 'sequential': {
      // Chain tasks through each agent
      agents.forEach((agent, i) => {
        tasks.push({
          id: `task-${i + 1}`,
          crewId: '',
          type: i === agents.length - 1 ? 'review' : 'sequential',
          description: getSequentialTaskDescription(agent.role, objective, i),
          assigneeRole: agent.role,
          dependsOn: i > 0 ? [`task-${i}`] : undefined,
          requireApproval: i === agents.length - 1,
          status: 'pending',
        })
      })
      break
    }

    case 'hierarchical': {
      // Leader delegates, others execute, leader reviews
      tasks.push({
        id: 'task-1',
        crewId: '',
        type: 'sequential',
        description: `Planificar la estrategia para: "${objective}". Definir subtareas y asignar responsables.`,
        assigneeRole: 'leader',
        status: 'pending',
      })
      agents.filter((a) => a.role !== 'leader').forEach((agent, i) => {
        tasks.push({
          id: `task-${i + 2}`,
          crewId: '',
          type: 'delegation',
          description: getDelegationTaskDescription(agent.role, objective),
          assigneeRole: agent.role,
          dependsOn: ['task-1'],
          status: 'pending',
        })
      })
      tasks.push({
        id: `task-${agents.length + 1}`,
        crewId: '',
        type: 'review',
        description: `Revisar y sintetizar los resultados del equipo. Consolidar en un output final para: "${objective}".`,
        assigneeRole: 'leader',
        dependsOn: agents.filter((a) => a.role !== 'leader').map((_, i) => `task-${i + 2}`),
        requireApproval: true,
        status: 'pending',
      })
      break
    }

    case 'parallel': {
      // All non-leaders work in parallel, leader synthesizes
      agents.filter((a) => a.role !== 'leader').forEach((agent, i) => {
        tasks.push({
          id: `task-${i + 1}`,
          crewId: '',
          type: 'parallel',
          description: getParallelTaskDescription(agent.role, objective),
          assigneeRole: agent.role,
          status: 'pending',
        })
      })
      tasks.push({
        id: `task-${agents.length}`,
        crewId: '',
        type: 'synthesis',
        description: `Sintetizar todas las contribuciones en un resultado unificado para: "${objective}"`,
        assigneeRole: 'leader',
        dependsOn: agents.filter((a) => a.role !== 'leader').map((_, i) => `task-${i + 1}`),
        status: 'pending',
      })
      break
    }

    case 'delegative': {
      // Leader splits into sub-tasks dynamically
      tasks.push({
        id: 'task-1',
        crewId: '',
        type: 'delegation',
        description: `Analizar el objetivo "${objective}" y descomponerlo en subtareas delegables.`,
        assigneeRole: 'leader',
        status: 'pending',
      })
      const executors = agents.filter((a) => a.role === 'executor' || a.role === 'researcher')
      executors.forEach((agent, i) => {
        tasks.push({
          id: `task-${i + 2}`,
          crewId: '',
          type: 'delegation',
          description: `Ejecutar subtarea ${i + 1} basada en el análisis del líder`,
          assigneeRole: agent.role,
          dependsOn: ['task-1'],
          status: 'pending',
        })
      })
      tasks.push({
        id: `task-${executors.length + 2}`,
        crewId: '',
        type: 'synthesis',
        description: `Consolidar los resultados de todas las subtareas en un deliverable final`,
        assigneeRole: 'leader',
        dependsOn: executors.map((_, i) => `task-${i + 2}`),
        requireApproval: true,
        status: 'pending',
      })
      break
    }
  }

  // Set crewId on all tasks
  return tasks.map((t) => ({ ...t, crewId: '' }))
}

function getSequentialTaskDescription(role: string, objective: string, index: number): string {
  const descriptions: Record<string, (obj: string) => string> = {
    researcher: (obj) => `Investigar y recopilar información relevante sobre: "${obj}". Buscar datos, ejemplos y referencias.`,
    analyst: (obj) => `Analizar la información recopilada sobre "${obj}". Identificar patrones, oportunidades y riesgos.`,
    writer: (obj) => `Redactar un documento basado en el análisis de: "${obj}". Incluir secciones claras y conclusiones.`,
    reviewer: (obj) => `Revisar críticamente el documento sobre "${obj}". Evaluar calidad, completitud y precisión.`,
    coder: (obj) => `Implementar la solución para: "${obj}". Escribir código limpio y bien documentado.`,
    leader: (obj) => `Planificar la estrategia general para: "${obj}". Definir objetivos y métricas de éxito.`,
    executor: (obj) => `Ejecutar el plan para: "${obj}". Implementar, iterar y reportar progreso.`,
  }
  return (descriptions[role] || descriptions.analyst)(objective)
}

function getDelegationTaskDescription(role: string, objective: string): string {
  return getSequentialTaskDescription(role, objective, 0)
}

function getParallelTaskDescription(role: string, objective: string): string {
  return `Desde tu perspectiva como ${role}, contribuí con ideas, análisis o propuestas sobre: "${objective}". Trabajá en paralelo con otros agentes.`
}

// ===== EXECUTION ENGINE =====

/**
 * Get the next executable tasks (all dependencies satisfied).
 */
export function getExecutableTasks(crew: OrchestratorCrew): OrchestratorTask[] {
  const completedIds = new Set(
    crew.tasks.filter((t) => t.status === 'completed').map((t) => t.id),
  )

  return crew.tasks.filter(
    (t) =>
      t.status === 'pending' &&
      (!t.dependsOn || t.dependsOn.every((depId) => completedIds.has(depId))),
  )
}

/**
 * Execute a task (simulate — real execution would call LLM).
 * Returns the result string.
 */
export async function executeTask(
  task: OrchestratorTask,
  agent: OrchestratorAgent,
  context: Record<string, unknown>,
): Promise<{ result: string; tokensUsed: number }> {
  // In production, this would call the LLM via z-ai-web-dev-sdk
  // For now, we generate a structured response template
  const taskNumber = task.id.replace('task-', '')
  const result = `[${agent.role.toUpperCase()} — ${agent.name}] Tarea #${taskNumber}\n${task.description}\n\nResultado: Tarea ejecutada exitosamente. Contexto recibido con ${Object.keys(context).length} variables.\n\n(Simulación — en producción, esto llamaría al LLM con el prompt del agente y sus memorias relevantes.)`

  return { result, tokensUsed: Math.floor(Math.random() * 500) + 200 }
}

/**
 * Format crew execution plan as a readable summary.
 */
export function formatCrewPlan(crew: OrchestratorCrew): string {
  const lines = [
    `## Crew: ${crew.name}`,
    `**Estrategia:** ${crew.strategy} | **Max turns:** ${crew.maxTurns} | **Status:** ${crew.status}`,
    '',
    '**Agentes:**',
    ...crew.agents.map((a) => `- ${a.role}: ${a.name} (${a.capabilities.join(', ')})`),
    '',
    '**Plan de Tareas:**',
    ...crew.tasks.map((t, i) => {
      const deps = t.dependsOn ? ` (depende de: ${t.dependsOn.join(', ')})` : ''
      const approval = t.requireApproval ? ' ⚠️ requiere aprobación' : ''
      return `${i + 1}. [${t.type}] ${t.assigneeRole}: ${t.description.slice(0, 80)}${deps}${approval}`
    }),
  ]
  return lines.join('\n')
}

/**
 * Get a context-enriched prompt for an agent task.
 */
export function buildAgentPrompt(
  agent: OrchestratorAgent,
  task: OrchestratorTask,
  previousResults: Array<{ taskId: string; result: string }>,
  objective: string,
): string {
  const contextBlock = previousResults.length > 0
    ? `\n\n## Contexto de tareas anteriores:\n${previousResults.map((r) => `---\n${r.result}`).join('\n')}`
    : ''

  return `Eres ${agent.name}, actuando como ${agent.role.toUpperCase()} en un equipo de NEXUS Sim.

## Objetivo del equipo:
${objective}

## Tu tarea:
${task.description}

## Tus capacidades:
${agent.capabilities.map((c) => `- ${c}`).join('\n')}
${contextBlock}

## Instrucciones:
Producí un output conciso y accionable. Incluí datos específicos cuando sea posible.`
}
