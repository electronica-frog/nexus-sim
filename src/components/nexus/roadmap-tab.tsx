'use client'

import React from 'react'
import { motion } from 'framer-motion'
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Map, CheckCircle2, Clock, AlertCircle, Rocket, Loader2, Circle,
  Zap, Database, Radio, GitBranch, BrainCircuit, Workflow, Container,
  Users, Plug, Gavel, FolderTree, Globe, ChevronRight,
  Bug, Puzzle, Server,
} from 'lucide-react'

// ===== Roadmap Data =====
interface RoadmapItem {
  id: string
  title: string
  description: string
  status: 'done' | 'in-progress' | 'pending' | 'future'
  tech?: string
  details?: string
  icon: React.ElementType
}

interface RoadmapPhase {
  id: string
  title: string
  subtitle: string
  color: string
  borderColor: string
  bgColor: string
  badgeColor: string
  items: RoadmapItem[]
}

const ROADMAP_PHASES: RoadmapPhase[] = [
  {
    id: 'inmediata',
    title: 'Fase Inmediata',
    subtitle: 'Bloqueadores criticos — Sin esto no hay app',
    color: 'text-red-400',
    borderColor: 'border-red-500/30',
    bgColor: 'bg-red-500/5',
    badgeColor: 'bg-red-500/20 text-red-300 border-red-500/40',
    items: [
      {
        id: 'oom-fix',
        title: 'Split final de page.tsx',
        description: 'Extraer tabs restantes (Agentes, Oleadas, Memoria, Specs, Propuestas) en componentes separados con dynamic imports',
        status: 'done',
        tech: 'Next.js dynamic() / React.lazy()',
        icon: Bug,
        details: 'page.tsx reducido de 3217 a 5 lineas. 10 componentes modulares creados. Build optimizado a 8.8s.',
      },
      {
        id: 'server-up',
        title: 'Levantar servidor estable',
        description: 'Hacer la app visible via Caddy proxy (port 81 → localhost:3000) en el chat de Discord sin OOM crashes',
        status: 'done',
        tech: 'Caddy / Next.js production / Watchdog',
        icon: Server,
        details: 'Production build exitoso (~190MB RSS). Watchdog + cron mantienen server vivo. Caddy proxy funcional.',
      },
    ],
  },
  {
    id: 'corto-plazo',
    title: 'Fase Corto Plazo',
    subtitle: 'Infraestructura base — Mejoras de busqueda y comunicacion',
    color: 'text-amber-400',
    borderColor: 'border-amber-500/30',
    bgColor: 'bg-amber-500/5',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    items: [
      {
        id: 'vector-db',
        title: 'ChromaDB Vector Store (all-MiniLM-L6-v2)',
        description: 'Busqueda semantica con ChromaDB + embeddings de 384 dimensiones. Reemplaza TF-IDF como motor primario con fallback automatico.',
        status: 'done',
        tech: 'ChromaDB / all-MiniLM-L6-v2 / 384-dim / Cosine Similarity',
        icon: Database,
        details: 'ChromaDB PersistentClient con almacenamiento en disco. Modelo all-MiniLM-L6-v2 genera embeddings semánticos de 384 dimensiones. Colecciones: nexus-memories, nexus-skills. Busqueda semántica real (no keyword matching). Fallback automático a TF-IDF si ChromaDB no tiene datos indexados.',
      },
      {
        id: 'websocket',
        title: 'Event Bus + SSE en Tiempo Real',
        description: 'In-memory pub/sub event bus con SSE endpoint para colaboracion multi-usuario en tiempo real.',
        status: 'done',
        tech: 'Event Bus / SSE / useNexusLive hook',
        icon: Radio,
        details: 'EventBus singleton con globalThis. Wave/pipeline emiten eventos broadcast. Endpoint /api/nexus/live con SSE. Hook React para consumir eventos. Indicador Live en dashboard.',
      },
      {
        id: 'github',
        title: 'GitHub CI/CD Pipeline',
        description: 'Pipeline de build/test automatico con GitHub Actions, .gitignore completo, .env.example preparado.',
        status: 'done',
        tech: 'GitHub Actions / Bun / Prisma',
        icon: GitBranch,
        details: 'Workflow build.yml creado con 7 steps. .gitignore completo. .env.example preparado. Git repo en main. Falta configurar remote y push.',
      },
    ],
  },
  {
    id: 'mediano-plazo',
    title: 'Fase Mediano Plazo',
    subtitle: 'Inteligencia avanzada — Memoria profunda y flujos condicionales',
    color: 'text-cyan-400',
    borderColor: 'border-cyan-500/30',
    bgColor: 'bg-cyan-500/5',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    items: [
      {
        id: 'mem0',
        title: 'Mem0 — Memoria a Largo Plazo con Decay',
        description: 'Memoria persistente con decay exponencial, relevance scoring, consolidacion automatica y garbage collection.',
        status: 'done',
        tech: 'Prisma MemoryStore / Exponential Decay / Relevance Scoring',
        icon: BrainCircuit,
        details: 'Tabla MemoryStore con campos: baseScore, decayRate, accessCount, lastAccessedAt. Formula: relevance = baseScore * e^(-decay*hours) * (1+log(accesses)) * recencyBoost. Extraccion automatica post-wave. Consolidacion de memorias similares. Garbage collection de memorias decaidas.',
      },
      {
        id: 'langgraph',
        title: 'LangGraph — Agent Graphs / State Machines',
        description: 'Grafos de flujo condicionales para cada tipo de oleada. Agentes se organizan en nodos con edges y decisiones dinamicas.',
        status: 'done',
        tech: 'agent-graph.ts / Custom Graph Interpreter',
        icon: Workflow,
        details: '5 grafos definidos (brainstorm, critique, synthesize, execute, quality_gate). Nodos: agent, aggregate, decision, transform, output. Estrategias de seleccion: top_trust, division, random. Evaluacion de decisiones basada en mood y confidence.',
      },
      {
        id: 'docker',
        title: 'Docker — Containerizacion Portable',
        description: 'Containerizar la app completa (Next.js + SQLite + Caddy) en un Docker Compose para deployment consistente en cualquier servidor.',
        status: 'done',
        tech: 'Docker / Docker Compose / Multi-stage Dockerfile / Caddy',
        icon: Container,
        details: 'Dockerfile multi-stage (deps → builder → runner). docker-compose.yml con 3 servicios: nexus (512MB), caddy (64MB), chroma (opcional). Caddyfile con SSE support. .dockerignore completo. `docker compose up -d` levanta todo.',
      },
    ],
  },
  {
    id: 'largo-plazo',
    title: 'Fase Largo Plazo',
    subtitle: 'Orquestacion avanzada — Frameworks externos y ecosistema',
    color: 'text-purple-400',
    borderColor: 'border-purple-500/30',
    bgColor: 'bg-purple-500/5',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    items: [
      {
        id: 'crewai',
        title: 'CrewAI / AutoGen — Orquestacion Multi-Agente Avanzada',
        description: 'Sistema de orquestacion con crews, roles jerarquicos, delegacion, tareas secuenciales/paralelas y ejecucion automatizada.',
        status: 'done',
        tech: 'orchestrator.ts / CrewAI Tab / 5 Templates / 7 Roles / 4 Strategies',
        icon: Users,
        details: '5 templates predefinidos (Research & Write, Code Dev, Brainstorm, Analysis Report, Auto-Pilot). 7 roles (leader, researcher, writer, reviewer, coder, analyst, executor). 4 estrategias (sequential, hierarchical, parallel, delegative). Generador automatico de planes de tareas. Ejecucion simulada con logging. Tab UI completo con visualizacion de plan.',
      },
      {
        id: 'mcp-full',
        title: 'MCP Protocol Completo — Full Tool Server',
        description: 'Expandir el endpoint MCP basico a un tool server completo que permita a NEXUS conectar con IDEs, CLIs, APIs externas y otros servicios.',
        status: 'done',
        tech: 'MCP Protocol / JSON-RPC / 16 Tools / 9 Resources / 4 Prompts',
        icon: Plug,
        details: '16 herramientas (waves, agents, specs, memory, proposals, export, system health). 9 recursos legibles (dashboard, agents, waves, mem0, specs, proposals, trust-network, activity-log, system-health). 4 prompts predefinidos (brainstorm, code_review, project_plan, retrospective). Compatible con Claude Desktop y VS Code MCP.',
      },
    ],
  },
  {
    id: 'fase-final',
    title: 'Fase Final: Botardo-OS',
    subtitle: 'Exportacion al ecosistema botardo-os — Modulo de simulacion multi-agente',
    color: 'text-emerald-400',
    borderColor: 'border-emerald-500/30',
    bgColor: 'bg-emerald-500/5',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    items: [
      {
        id: 'eval-auto',
        title: 'Evaluacion Automatica con LLM Judges',
        description: 'Meta-evaluacion: agentes "juez" especializados que puntuan automaticamente la calidad de cada oleada, creando un loop de mejora continua.',
        status: 'done',
        tech: 'z-ai-web-dev-sdk / llm-judge.ts / 5 Dimensiones / Trust Feedback Loop',
        icon: Gavel,
        details: 'Evaluacion en 5 dimensiones ponderadas: Relevancia (0.25), Profundidad (0.25), Creatividad (0.20), Coherencia (0.15), Accionabilidad (0.15). Resultados alimentan trust scores automaticamente. Highlights de mejores/peores agentes. Historial de evaluaciones con score global. Fallback a metricas heuristicas si LLM no disponible.',
      },
      {
        id: 'multi-proyecto',
        title: 'Multi-Proyecto con Agent Pool Compartido',
        description: 'Soportar multiples proyectos simultaneos con un pool de agentes compartido y aprendizaje cruzado entre proyectos (cross-project knowledge transfer).',
        status: 'done',
        tech: 'Project Selector / localStorage persistence / Cross-Project API / State Reset',
        icon: FolderTree,
        details: 'Project selector dropdown en header. SelectProject() con state reset completo. localStorage persiste ultimo proyecto seleccionado. POST /api/nexus/project crea proyectos con todos los agentes. Cross-project knowledge transfer: skills, memories y Mem0 transferibles entre proyectos. Agents globales con ProjectAgent junction table.',
      },
      {
        id: 'botardo-export',
        title: 'Export a Botardo-OS — Modulo NEXUS',
        description: 'Integracion completa con el ecosistema botardo-os como modulo de simulacion multi-agente: API publica, webhooks, shared infrastructure, marketplace de agentes.',
        status: 'done',
        tech: 'Module Manifest / 12 Capabilities / Webhooks / MCP Integration / API Export',
        icon: Globe,
        details: 'GET /api/nexus/botardo-os genera manifest completo con: module metadata, agent definitions portables, API endpoints docs, MCP config, webhooks (11 event types), 12 capabilities documentadas, integration quick-start guide. POST /api/nexus/botardo-os registra instancia en hub externo. NEXUS listo como modulo importable del ecosistema.',
      },
    ],
  },
  {
    id: 'phase-2',
    title: 'Phase 2: Post-Roadmap',
    subtitle: 'Mejoras de UX y funcionalidad avanzada',
    color: 'text-rose-400',
    borderColor: 'border-rose-500/30',
    bgColor: 'bg-rose-500/5',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    items: [
      {
        id: 'projects-tab',
        title: 'Tab de Proyectos con Gestión Completa',
        description: 'Tab dedicado para gestión de proyectos: crear, archivar, eliminar, comparar, y transferir conocimiento entre proyectos.',
        status: 'done',
        tech: 'ProjectsTab / Cross-Project Transfer UI / Archive/Delete',
        icon: FolderTree,
        details: 'Tab dedicado con project cards mostrando stats (agentes, oleadas, memorias, propuestas). Botones de archive/delete con confirmación. Panel de cross-project transfer visual con selección de items transferibles. Comparación side-by-side de proyectos.',
      },
    ],
  },
]

// ===== Completed Features (from worklog) =====
const COMPLETED_FEATURES = [
  { name: '154 agentes desde The Agency', icon: Users },
  { name: '5 tipos de oleadas', icon: Zap },
  { name: 'Pipeline automatico (5 pasos)', icon: Workflow },
  { name: 'Streaming SSE en tiempo real', icon: Radio },
  { name: 'Red de Confianza (trust scores)', icon: CheckCircle2 },
  { name: 'Memoria Semantica cross-agent', icon: BrainCircuit },
  { name: 'Auto-Mejora (skill extraction)', icon: Puzzle },
  { name: 'Spec-Driven Development (kanban)', icon: FolderTree },
  { name: 'Benchmarking & Metricas', icon: CheckCircle2 },
  { name: 'Exportacion JSON/CSV', icon: Database },
  { name: 'API Docs (/docs)', icon: Globe },
  { name: 'MCP Protocol endpoint', icon: Plug },
  { name: 'Activity Feed & System Health', icon: CheckCircle2 },
  { name: 'Cron Ralph Loop (autonomo)', icon: Clock },
  { name: 'Retry & Error handling', icon: CheckCircle2 },
  { name: 'Busqueda Vectorial TF-IDF', icon: Database },
  { name: 'Event Bus + Live SSE', icon: Radio },
  { name: 'CI/CD Pipeline (GitHub Actions)', icon: GitBranch },
  { name: 'Mem0 Memory Store (decay + relevance)', icon: BrainCircuit },
  { name: 'Agent Graphs / State Machines', icon: Workflow },
  { name: 'ChromaDB Vector Search (384-dim)', icon: Database },
  { name: 'Socket.io code (server + client)', icon: Radio },
  { name: 'Docker Containerization', icon: Container },
  { name: 'Banner "Cómo Funciona Esto"', icon: CheckCircle2 },
  { name: 'MCP Full Server (16 tools)', icon: Plug },
  { name: 'CrewAI Orquestación', icon: Users },
  { name: 'LLM Judges (5 dimensiones)', icon: Gavel },
  { name: 'Multi-Proyecto + Cross-Project Transfer', icon: FolderTree },
  { name: 'Botardo-OS Module Export', icon: Globe },
  { name: 'Projects Tab (Gestión + Cross-Project)', icon: FolderTree },
]

function getStatusConfig(status: RoadmapItem['status']) {
  switch (status) {
    case 'done':
      return { icon: CheckCircle2, color: 'text-emerald-400', bgColor: 'bg-emerald-500/20', label: 'Completado', borderColor: 'border-emerald-500/30' }
    case 'in-progress':
      return { icon: Loader2, color: 'text-amber-400', bgColor: 'bg-amber-500/20', label: 'En Progreso', borderColor: 'border-amber-500/30' }
    case 'pending':
      return { icon: Clock, color: 'text-zinc-300', bgColor: 'bg-zinc-500/20', label: 'Pendiente', borderColor: 'border-zinc-700' }
    case 'future':
      return { icon: Circle, color: 'text-purple-400', bgColor: 'bg-purple-500/20', label: 'Futuro', borderColor: 'border-purple-500/30' }
  }
}

// ===== Component =====
export function RoadmapTab() {
  const totalItems = ROADMAP_PHASES.reduce((sum, p) => sum + p.items.length, 0)
  const doneItems = ROADMAP_PHASES.reduce((sum, p) => sum + p.items.filter((i) => i.status === 'done').length, 0)
  const inProgressItems = ROADMAP_PHASES.reduce((sum, p) => sum + p.items.filter((i) => i.status === 'in-progress').length, 0)
  const overallProgress = Math.round(((doneItems + inProgressItems * 0.5) / totalItems) * 100)

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Map className="h-5 w-5 text-emerald-400" />
            Roadmap NEXUS Sim v2
          </CardTitle>
          <CardDescription className="text-zinc-300 text-sm">
            Plan estrategico de desarrollo — Tecnologias a adaptar gradualmente hasta exportar a botardo-os
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress overview */}
          <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-zinc-300 font-medium">Progreso General del Roadmap</span>
              <span className="text-sm font-bold text-emerald-400">{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="h-2.5 [&>div]:bg-gradient-to-r [&>div]:from-emerald-500 [&>div]:to-cyan-500" />
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-[10px] text-zinc-300">Completado: {doneItems}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-[10px] text-zinc-300">En Progreso: {inProgressItems}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-500" />
                <span className="text-[10px] text-zinc-300">Pendiente: {totalItems - doneItems - inProgressItems}</span>
              </div>
            </div>
          </div>

          {/* Already Built */}
          <div>
            <h3 className="text-sm font-medium text-zinc-200 mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Ya Construido (28 fases completadas)
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {COMPLETED_FEATURES.map((feat, i) => {
                const FeatIcon = feat.icon
                return (
                  <motion.div
                    key={feat.name}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <Badge variant="outline" className="border-emerald-500/30 text-emerald-300 text-[11px] px-2 py-1 gap-1">
                      <FeatIcon className="h-3 w-3" />
                      {feat.name}
                    </Badge>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Phase Cards */}
      {ROADMAP_PHASES.map((phase, phaseIdx) => (
        <motion.div
          key={phase.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 + phaseIdx * 0.1 }}
        >
          <Card className={`${phase.bgColor} ${phase.borderColor} border`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className={`${phase.badgeColor} border text-xs font-medium`}>{phase.title}</Badge>
                  <span className="text-xs text-zinc-400">{phase.subtitle}</span>
                </div>
                <span className={`text-xs ${phase.color}`}>
                  {phase.items.filter((i) => i.status === 'done').length}/{phase.items.length}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {phase.items.map((item, itemIdx) => {
                const statusCfg = getStatusConfig(item.status)
                const StatusIcon = statusCfg.icon
                const ItemIcon = item.icon
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + phaseIdx * 0.1 + itemIdx * 0.05 }}
                    className={`p-3 rounded-lg border ${statusCfg.borderColor} ${statusCfg.bgColor}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 ${statusCfg.color}`}>
                        <StatusIcon className={`h-4 w-4 ${item.status === 'in-progress' ? 'animate-spin' : ''}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <ItemIcon className={`h-3.5 w-3.5 ${phase.color}`} />
                          <span className="text-sm font-medium text-zinc-100">{item.title}</span>
                          <Badge variant="outline" className={`border-current/20 ${statusCfg.color} text-[9px]`}>
                            {statusCfg.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-zinc-300 leading-relaxed">{item.description}</p>
                        {item.tech && (
                          <div className="mt-1.5">
                            <Badge variant="outline" className="border-zinc-700 text-zinc-400 text-[10px] px-1.5">
                              <ChevronRight className="h-2.5 w-2.5 mr-0.5" />
                              {item.tech}
                            </Badge>
                          </div>
                        )}
                        {item.details && (
                          <p className="text-[11px] text-zinc-400 mt-1.5 leading-relaxed">{item.details}</p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </CardContent>
          </Card>
        </motion.div>
      ))}

      {/* Footer Note */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="py-4 text-center">
          <p className="text-xs text-zinc-400 leading-relaxed">
            <Map className="h-3.5 w-3.5 inline mr-1.5 text-emerald-400" />
            Este roadmap es vivo y se actualiza conforme avanza el desarrollo.
            Destino final: exportar NEXUS Sim como modulo del ecosistema{' '}
            <span className="text-emerald-400 font-medium">botardo-os</span>.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
