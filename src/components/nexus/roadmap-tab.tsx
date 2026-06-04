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
        status: 'in-progress',
        tech: 'Next.js dynamic() / React.lazy()',
        icon: Bug,
        details: 'page.tsx reducido de 3217 a 1083 lineas. Faltan Agentes, Oleadas, Memoria, Specs, Propuestas como componentes independientes.',
      },
      {
        id: 'server-up',
        title: 'Levantar servidor estable',
        description: 'Hacer la app visible via Caddy proxy (port 81 → localhost:3000) en el chat de Discord sin OOM crashes',
        status: 'in-progress',
        tech: 'Caddy / Next.js production',
        icon: Server,
        details: 'El contenedor tiene ~8GB RAM compartida con muchos procesos. El server se muere despues de ~60s idle. Necesita keepalive y build optimizado.',
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
        title: 'ChromaDB / Qdrant — Busqueda Semantica Vectorial',
        description: 'Reemplazar SQLite LIKE con embeddings vectoriales para memoria de agentes. Búsqueda por significado, no solo por palabras clave.',
        status: 'pending',
        tech: 'ChromaDB / Qdrant (local, gratis, open-source)',
        icon: Database,
        details: 'Actualmente la busqueda de memorias usa SQLite `contains` (LIKE). Con una vector DB se busca por similitud semantica: "seguridad" encuentra "proteccion", "auth", etc.',
      },
      {
        id: 'websocket',
        title: 'WebSocket (Socket.io) — Colaboracion Bidireccional',
        description: 'Agregar comunicacion real bidireccional para colaboracion en vivo entre usuarios y agentes. SSe es unidireccional.',
        status: 'pending',
        tech: 'Socket.io / Next.js API WebSocket',
        icon: Radio,
        details: 'Permitir que multiples usuarios vean las oleadas en tiempo real, comenten y reaccionen. Base para modo colaborativo.',
      },
      {
        id: 'github',
        title: 'GitHub Setup + CI/CD Basico',
        description: 'Configurar repositorio, GitHub Actions para build/test automatico, y preparar integracion con botardo-os.',
        status: 'pending',
        tech: 'GitHub Actions / Docker build',
        icon: GitBranch,
        details: 'No hay remote configurado todavia. Necesitamos repo, .gitignore limpio, y pipeline CI para asegurar que el build no se rompa.',
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
        title: 'Mem0 — Memoria Persistente con Embeddings',
        description: 'Capa de memoria semantica profunda con embeddings. Los agentes recuerdan contexto de sesiones pasadas con significado, no solo texto.',
        status: 'pending',
        tech: 'Mem0 (open-source) / sentence-transformers',
        icon: BrainCircuit,
        details: 'Upgrade del sistema actual de memoria (localStorage + SQLite). Mem0 permite recordar implicitamente y recall por similitud semantica.',
      },
      {
        id: 'langgraph',
        title: 'LangGraph — Pipelines como Grafos Condicionales',
        description: 'Reemplazar el pipeline secuencial (brainstorm→critique→synthesize→execute→QA) con un grafo condicional donde cada paso decide el siguiente dinamicamente.',
        status: 'pending',
        tech: 'LangGraph (open-source)',
        icon: Workflow,
        details: 'Ejemplo: si brainstorm produce baja confianza, el grafo envia a critique extra antes de synthesize. Si QA falla, vuelve a execute automaticamente.',
      },
      {
        id: 'docker',
        title: 'Docker — Containerizacion Portable',
        description: 'Containerizar la app completa (Next.js + SQLite + Caddy) en un Docker Compose para deployment consistente en cualquier servidor.',
        status: 'pending',
        tech: 'Docker / Docker Compose',
        icon: Container,
        details: 'Permite levantar NEXUS Sim en cualquier lado con un solo `docker compose up`. Base para botardo-os deployment.',
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
        description: 'Integrar con un framework externo de orquestacion para flujos complejos con roles, jerarquias y delegacion entre agentes.',
        status: 'future',
        tech: 'CrewAI / Microsoft AutoGen (open-source)',
        icon: Users,
        details: 'CrewAI permite definir "crews" de agentes con roles (Leader, Researcher, Writer) y tareas jerarquicas. AutoGen permite conversaciones multi-turno human-in-the-loop.',
      },
      {
        id: 'mcp-full',
        title: 'MCP Protocol Completo — Full Tool Server',
        description: 'Expandir el endpoint MCP basico a un tool server completo que permita a NEXUS conectar con IDEs, CLIs, APIs externas y otros servicios.',
        status: 'future',
        tech: 'MCP Protocol / JSON-RPC',
        icon: Plug,
        details: 'Actualmente hay 6 herramientas basicas. MCP completo permite: acceso a filesystem, llamadas HTTP, integracion con VS Code, Claude Desktop, etc.',
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
        status: 'future',
        tech: 'z-ai-web-dev-sdk / Prompt Engineering',
        icon: Gavel,
        details: 'Despues de cada oleada, un agente juez evalua: relevancia, profundidad, creatividad, coherencia con contexto. Los resultados alimentan trust scores y auto-mejora.',
      },
      {
        id: 'multi-proyecto',
        title: 'Multi-Proyecto con Agent Pool Compartido',
        description: 'Soportar multiples proyectos simultaneos con un pool de agentes compartido y aprendizaje cruzado entre proyectos (cross-project knowledge transfer).',
        status: 'future',
        tech: 'Prisma multi-tenant / Schema per project',
        icon: FolderTree,
        details: 'Actualmente un solo proyecto. Multi-proyecto permite comparar estrategias, reusar agentes, y transferir aprendizajes entre proyectos distintos.',
      },
      {
        id: 'botardo-export',
        title: 'Export a Botardo-OS — Modulo NEXUS',
        description: 'Integracion completa con el ecosistema botardo-os como modulo de simulacion multi-agente: API publica, webhooks, shared infrastructure, marketplace de agentes.',
        status: 'future',
        tech: 'botardo-os ecosystem',
        icon: Globe,
        details: 'NEXUS Sim se convierte en un modulo mas del ecosistema botardo-os. Otros proyectos pueden consumir la API de simulacion, crear agentes custom, y contribuir al marketplace.',
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
              Ya Construido (18 fases completadas)
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
