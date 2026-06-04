'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, BookOpen, Activity, Waves, Users, Brain, FileText,
  ClipboardList, Cpu, Download, Zap, Shield, Target, Search,
  ChevronDown, ChevronUp, Copy, CheckCircle2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

// ===== Types =====
interface Endpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string
  description: string
  params?: { name: string; type: string; required: boolean; description: string }[]
  body?: { name: string; type: string; required: boolean; description: string }[]
  response?: string
  notes?: string
}

interface EndpointGroup {
  title: string
  icon: typeof Activity
  color: string
  endpoints: Endpoint[]
}

// ===== Data =====
const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  POST: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  PUT: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  DELETE: 'bg-red-500/20 text-red-300 border-red-500/40',
}

const ENDPOINT_GROUPS: EndpointGroup[] = [
  {
    title: 'Núcleo',
    icon: Activity,
    color: 'text-emerald-400',
    endpoints: [
      {
        method: 'GET',
        path: '/api/nexus',
        description: 'Obtener lista de proyectos o el estado completo de un proyecto',
        params: [
          { name: 'projectId', type: 'string', required: false, description: 'ID del proyecto (opcional). Si se omite, devuelve la lista de todos los proyectos.' },
        ],
        response: `{
  "projects": [{ "id": "...", "name": "...", "status": "active", "_count": { "waves": 5, "agents": 12 } }]
}
// o con projectId:
{
  "project": { "id": "...", "name": "...", "waves": [...], "agents": [...], "memories": [...] }
}`,
      },
      {
        method: 'POST',
        path: '/api/nexus',
        description: 'Sembrar los agentes desde The Agency (inicializar sistema)',
        body: [],
        response: `{
  "success": true,
  "agentsCount": 154
}`,
      },
      {
        method: 'POST',
        path: '/api/nexus/project',
        description: 'Crear un nuevo proyecto con todos los agentes asignados',
        body: [
          { name: 'name', type: 'string', required: true, description: 'Nombre del proyecto' },
          { name: 'description', type: 'string', required: false, description: 'Descripción del proyecto' },
        ],
        response: `{
  "project": { "id": "clx...", "name": "Mi Proyecto", "status": "active" },
  "agentsAssigned": 154
}`,
      },
    ],
  },
  {
    title: 'Oleadas',
    icon: Waves,
    color: 'text-amber-400',
    endpoints: [
      {
        method: 'POST',
        path: '/api/nexus/wave',
        description: 'Ejecutar una oleada (brainstorm, crítica, síntesis, ejecución, control de calidad)',
        body: [
          { name: 'projectId', type: 'string', required: true, description: 'ID del proyecto' },
          { name: 'type', type: 'string', required: true, description: 'Tipo: brainstorm | critique | synthesize | execute | quality_gate' },
          { name: 'prompt', type: 'string', required: true, description: 'El problema o tema a discutir' },
          { name: 'selectedAgentIds', type: 'string[]', required: false, description: 'IDs de agentes seleccionados (auto-selección si se omite)' },
          { name: 'specId', type: 'string', required: false, description: 'ID de spec vinculada (opcional)' },
        ],
        response: `{
  "wave": {
    "id": "...", "number": 1, "type": "brainstorm", "status": "completed",
    "prompt": "¿Cómo mejorar la UX?",
    "responses": [
      { "content": "...", "confidence": 0.85, "mood": "enthusiastic", "projectAgent": { "agent": { "name": "..." } } }
    ]
  }
}`,
      },
      {
        method: 'POST',
        path: '/api/nexus/wave-stream',
        description: 'Ejecutar oleada con streaming SSE en tiempo real (Server-Sent Events)',
        notes: 'Los eventos SSE enviados: agent_start, agent_response, agent_done, wave_complete',
        body: [
          { name: 'projectId', type: 'string', required: true, description: 'ID del proyecto' },
          { name: 'type', type: 'string', required: true, description: 'Tipo de oleada' },
          { name: 'prompt', type: 'string', required: true, description: 'El problema o tema' },
          { name: 'selectedAgentIds', type: 'string[]', required: false, description: 'IDs de agentes' },
          { name: 'specId', type: 'string', required: false, description: 'ID de spec vinculada' },
        ],
        response: `event: agent_start\ndata: {"agentId":"...","agentName":"Frontend Dev","emoji":"👨‍💻"}\n\nevent: agent_response\ndata: {"agentId":"...","content":"...","confidence":0.8,"mood":"enthusiastic"}\n\nevent: wave_complete\ndata: {"waveNumber":1,"totalResponses":6,"synthesis":"..."}`,
      },
      {
        method: 'POST',
        path: '/api/nexus/pipeline-stream',
        description: 'Ejecutar pipeline automático de 3 pasos: brainstorm → critique → synthesize',
        notes: 'Streaming SSE con eventos adicionales: pipeline_step, pipeline_step_complete, pipeline_complete',
        body: [
          { name: 'projectId', type: 'string', required: true, description: 'ID del proyecto' },
          { name: 'prompt', type: 'string', required: true, description: 'El problema o tema' },
        ],
        response: `event: pipeline_step\ndata: {"step":1,"type":"brainstorm","label":"Paso 1/3: Lluvia de Ideas"}\n\nevent: pipeline_complete\ndata: {"totalResponses":18,"executiveSummary":"..."}`,
      },
    ],
  },
  {
    title: 'Agentes',
    icon: Users,
    color: 'text-cyan-400',
    endpoints: [
      {
        method: 'GET',
        path: '/api/nexus/metrics',
        description: 'Obtener métricas de rendimiento por agente y agregadas',
        params: [
          { name: 'projectId', type: 'string', required: true, description: 'ID del proyecto' },
        ],
        response: `{
  "metrics": [
    {
      "agentName": "Frontend Developer", "agentEmoji": "👨‍💻", "agentDivision": "engineering",
      "trustScore": 0.72, "totalWaves": 5, "avgConfidence": 0.78,
      "avgResponseLength": 342, "successRate": 1.0,
      "moodDistribution": { "enthusiastic": 3, "neutral": 2, "skeptical": 0, "concerned": 0 },
      "dominantMood": "enthusiastic"
    }
  ],
  "aggregates": {
    "totalResponses": 48, "avgConfidence": 0.72,
    "mostActiveDivision": "engineering",
    "mostTrustedAgent": { "name": "Frontend Developer", "emoji": "👨‍💻", "trustScore": 0.72 }
  }
}`,
      },
    ],
  },
  {
    title: 'Memoria',
    icon: Brain,
    color: 'text-purple-400',
    endpoints: [
      {
        method: 'GET',
        path: '/api/nexus/memory',
        description: 'Obtener memorias de un agente específico en un proyecto',
        params: [
          { name: 'projectId', type: 'string', required: true, description: 'ID del proyecto' },
          { name: 'agentId', type: 'string', required: true, description: 'ID del agente' },
        ],
        response: `{
  "memories": [
    { "id": "...", "type": "learning", "content": "...", "tags": "brainstorm,wave1", "importance": 0.8 }
  ]
}`,
      },
      {
        method: 'POST',
        path: '/api/nexus/memory',
        description: 'Almacenar una memoria nueva para un agente',
        body: [
          { name: 'projectId', type: 'string', required: true, description: 'ID del proyecto' },
          { name: 'agentId', type: 'string', required: true, description: 'ID del agente' },
          { name: 'type', type: 'string', required: false, description: 'fact | learning | preference | pattern' },
          { name: 'content', type: 'string', required: true, description: 'Contenido de la memoria' },
          { name: 'tags', type: 'string', required: false, description: 'Etiquetas separadas por coma' },
          { name: 'importance', type: 'number', required: false, description: 'Importancia 0.0 a 1.0' },
        ],
        response: `{ "memory": { "id": "...", "type": "learning", "content": "..." } }`,
      },
      {
        method: 'GET',
        path: '/api/nexus/shared-learnings',
        description: 'Obtener aprendizajes compartidos entre agentes (memoria semántica)',
        params: [
          { name: 'projectId', type: 'string', required: true, description: 'ID del proyecto' },
          { name: 'division', type: 'string', required: false, description: 'Filtrar por división' },
          { name: 'minImportance', type: 'number', required: false, description: 'Importancia mínima (default: 0.6)' },
        ],
        response: `{
  "learnings": [{ "agentName": "...", "content": "...", "importance": 0.9, "waveType": "brainstorm" }],
  "grouped": { "brainstorm": [...], "critique": [...] },
  "total": 15
}`,
      },
      {
        method: 'GET',
        path: '/api/nexus/memory-search',
        description: 'Buscar memorias por palabra clave (búsqueda de texto)',
        params: [
          { name: 'projectId', type: 'string', required: true, description: 'ID del proyecto' },
          { name: 'q', type: 'string', required: true, description: 'Query de búsqueda (mínimo 2 caracteres)' },
          { name: 'limit', type: 'number', required: false, description: 'Límite de resultados (default: 20)' },
        ],
        response: `{
  "query": "UX",
  "results": [{ "agentName": "...", "content": "...", "importance": 0.8 }],
  "total": 8
}`,
      },
    ],
  },
  {
    title: 'Specs',
    icon: ClipboardList,
    color: 'text-amber-300',
    endpoints: [
      {
        method: 'GET',
        path: '/api/nexus/specs',
        description: 'Listar todas las especificaciones de un proyecto',
        params: [
          { name: 'projectId', type: 'string', required: true, description: 'ID del proyecto' },
        ],
        response: `{
  "specs": [
    { "id": "...", "title": "...", "phase": "draft", "priority": "medium", "status": "active", "_count": { "waves": 2 } }
  ]
}`,
      },
      {
        method: 'POST',
        path: '/api/nexus/spec',
        description: 'Crear una nueva especificación',
        body: [
          { name: 'projectId', type: 'string', required: true, description: 'ID del proyecto' },
          { name: 'title', type: 'string', required: true, description: 'Título de la spec' },
          { name: 'description', type: 'string', required: false, description: 'Descripción' },
          { name: 'priority', type: 'string', required: false, description: 'low | medium | high | critical' },
        ],
        response: `{ "spec": { "id": "...", "title": "...", "phase": "draft" } }`,
      },
      {
        method: 'PUT',
        path: '/api/nexus/spec',
        description: 'Actualizar una especificación existente',
        params: [
          { name: 'id', type: 'string', required: true, description: 'ID de la spec (query param ?id=)' },
        ],
        body: [
          { name: 'title', type: 'string', required: false, description: 'Nuevo título' },
          { name: 'description', type: 'string', required: false, description: 'Nueva descripción' },
          { name: 'phase', type: 'string', required: false, description: 'draft | design | implementation | review | completed' },
          { name: 'priority', type: 'string', required: false, description: 'low | medium | high | critical' },
          { name: 'status', type: 'string', required: false, description: 'active | archived' },
        ],
        response: `{ "spec": { "id": "...", "title": "...", "phase": "design" } }`,
      },
      {
        method: 'DELETE',
        path: '/api/nexus/spec',
        description: 'Eliminar una especificación',
        params: [
          { name: 'id', type: 'string', required: true, description: 'ID de la spec (query param ?id=)' },
        ],
        response: `{ "success": true }`,
      },
    ],
  },
  {
    title: 'Propuestas',
    icon: Target,
    color: 'text-rose-400',
    endpoints: [
      {
        method: 'PUT',
        path: '/api/nexus/proposal',
        description: 'Actualizar estado de una propuesta (aprobada, rechazada, implementada)',
        params: [
          { name: 'id', type: 'string', required: true, description: 'ID de la propuesta (query param ?id=)' },
        ],
        body: [
          { name: 'status', type: 'string', required: true, description: 'proposed | approved | rejected | implemented' },
        ],
        response: `{ "proposal": { "id": "...", "status": "approved" } }`,
      },
    ],
  },
  {
    title: 'MCP (Model Context Protocol)',
    icon: Cpu,
    color: 'text-zinc-300',
    endpoints: [
      {
        method: 'POST',
        path: '/api/nexus/mcp',
        description: 'Protocolo MCP para integración con herramientas externas (JSON-RPC)',
        notes: 'Herramientas disponibles: nexus_run_wave, nexus_get_status, nexus_get_agents, nexus_get_waves, nexus_create_spec, nexus_search_memory',
        body: [
          { name: 'jsonrpc', type: 'string', required: true, description: 'Versión del protocolo: "2.0"' },
          { name: 'method', type: 'string', required: true, description: 'initialize | tools/list | tools/call' },
          { name: 'params', type: 'object', required: false, description: 'Parámetros del método' },
          { name: 'id', type: 'number', required: true, description: 'ID de la petición' },
        ],
        response: `// tools/list
{ "result": { "tools": [{ "name": "nexus_run_wave", "description": "..." }] } }

// tools/call
{ "result": { "content": [{ "type": "text", "text": "..." }] } }`,
      },
    ],
  },
  {
    title: 'Exportación',
    icon: Download,
    color: 'text-emerald-300',
    endpoints: [
      {
        method: 'GET',
        path: '/api/nexus/export/waves',
        description: 'Exportar todas las oleadas con respuestas (JSON o CSV descargable)',
        notes: 'Devuelve archivo con Content-Disposition: attachment',
        params: [
          { name: 'projectId', type: 'string', required: true, description: 'ID del proyecto' },
          { name: 'format', type: 'string', required: false, description: 'json (default) | csv' },
        ],
        response: `// JSON: { "exportedAt": "...", "waves": [...] }
// CSV: Oleada #,Tipo,Estado,Prompt,Resultado,Agente,Confianza,...`,
      },
      {
        method: 'GET',
        path: '/api/nexus/export/metrics',
        description: 'Exportar métricas de rendimiento de agentes (JSON o CSV)',
        params: [
          { name: 'projectId', type: 'string', required: true, description: 'ID del proyecto' },
          { name: 'format', type: 'string', required: false, description: 'json (default) | csv' },
        ],
        response: `// JSON: { "exportedAt": "...", "metrics": [...] }
// CSV: Agente,Emoji,División,Rol,Confiabilidad,Oleadas,...`,
      },
      {
        method: 'GET',
        path: '/api/nexus/export/memories',
        description: 'Exportar todas las memorias de aprendizaje de agentes',
        params: [
          { name: 'projectId', type: 'string', required: true, description: 'ID del proyecto' },
        ],
        response: `{ "exportedAt": "...", "memorias": [{ "agente": "...", "tipo": "learning", "contenido": "..." }] }`,
      },
      {
        method: 'GET',
        path: '/api/nexus/export/project',
        description: 'Exportar el proyecto completo: agentes, oleadas, respuestas, memorias, propuestas, specs y puntuaciones de confianza',
        params: [
          { name: 'projectId', type: 'string', required: true, description: 'ID del proyecto' },
        ],
        response: `{
  "exportedAt": "...",
  "proyecto": { "nombre": "...", "estado": "active" },
  "agentes": [{ "rol": "...", "confianza": 0.7, "agente": { "nombre": "..." } }],
  "oleadas": [{ "numero": 1, "tipo": "brainstorm", "respuestas": [...] }],
  "memorias": [...], "propuestas": [...], "specs": [...]
}`,
      },
    ],
  },
]

// ===== Component =====
export default function DocsPage() {
  const [expandedGroup, setExpandedGroup] = useState<string | null>('core')
  const [copiedPath, setCopiedPath] = useState<string | null>(null)

  const toggleGroup = (title: string) => {
    setExpandedGroup((prev) => (prev === title ? null : title))
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedPath(text)
      toast.success('Copiado al portapapeles')
      setTimeout(() => setCopiedPath(null), 2000)
    })
  }

  const getGroupKey = (title: string) => title.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800">
        <div className="max-w-5xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 text-zinc-300 hover:text-zinc-100 transition-colors">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">Volver</span>
            </Link>
            <div className="w-px h-6 bg-zinc-800" />
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-emerald-400" />
              <h1 className="text-lg font-bold">API Documentation</h1>
            </div>
          </div>
          <Badge variant="outline" className="border-zinc-700 text-zinc-300 text-xs">
            v1.0
          </Badge>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-5xl mx-auto px-4 md:px-6 py-8 space-y-6">
        {/* Intro */}
        <div className="space-y-3">
          <h2 className="text-2xl font-bold">NEXUS Sim API</h2>
          <p className="text-zinc-300 max-w-2xl">
            Documentación completa de los endpoints de la API REST del sistema de simulación multi-agente NEXUS.
            Incluye endpoints para gestión de proyectos, ejecución de oleadas, memorias, specs, propuestas, MCP y exportación de datos.
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs">
              Base URL: /api/nexus
            </Badge>
            <Badge className="bg-zinc-500/20 text-zinc-300 border border-zinc-500/30 text-xs">
              Formato: JSON
            </Badge>
            <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs">
              Streaming: SSE
            </Badge>
          </div>
        </div>

        {/* Quick Overview */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-zinc-200">Resumen Rápido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              {[
                { label: 'Endpoints', value: ENDPOINT_GROUPS.reduce((s, g) => s + g.endpoints.length, 0).toString(), color: 'text-emerald-400' },
                { label: 'Categorías', value: ENDPOINT_GROUPS.length.toString(), color: 'text-cyan-400' },
                { label: 'Métodos', value: 'GET, POST, PUT, DELETE', color: 'text-amber-400' },
                { label: 'Streaming', value: 'SSE Support', color: 'text-purple-400' },
              ].map((item) => (
                <div key={item.label} className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-800">
                  <p className={`text-sm font-bold ${item.color}`}>{item.value}</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Endpoint Groups */}
        {ENDPOINT_GROUPS.map((group) => {
          const key = getGroupKey(group.title)
          const isExpanded = expandedGroup === key
          const GroupIcon = group.icon

          return (
            <Card key={key} className="bg-zinc-900 border-zinc-800 overflow-hidden">
              <button
                onClick={() => toggleGroup(key)}
                className="w-full flex items-center gap-3 p-4 hover:bg-zinc-800/50 transition-colors text-left"
              >
                <GroupIcon className={`h-5 w-5 ${group.color}`} />
                <span className="font-semibold flex-1">{group.title}</span>
                <Badge variant="outline" className="border-zinc-700 text-zinc-400 text-[10px]">
                  {group.endpoints.length} endpoint{group.endpoints.length > 1 ? 's' : ''}
                </Badge>
                {isExpanded ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
              </button>

              {isExpanded && (
                <div className="border-t border-zinc-800">
                  {group.endpoints.map((endpoint, idx) => (
                    <div
                      key={idx}
                      className={`p-4 ${idx < group.endpoints.length - 1 ? 'border-b border-zinc-800/50' : ''}`}
                    >
                      {/* Method + Path */}
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={`${METHOD_COLORS[endpoint.method]} text-[11px] font-mono px-2 py-0.5`}>
                          {endpoint.method}
                        </Badge>
                        <code className="text-sm text-zinc-200 font-mono flex-1 min-w-0 truncate">{endpoint.path}</code>
                        <button
                          onClick={() => copyToClipboard(endpoint.path)}
                          className="text-zinc-500 hover:text-zinc-300 transition-colors shrink-0"
                          title="Copiar path"
                        >
                          {copiedPath === endpoint.path ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>

                      {/* Description */}
                      <p className="text-sm text-zinc-300 mb-3">{endpoint.description}</p>

                      {endpoint.notes && (
                        <p className="text-xs text-zinc-400 mb-3 flex items-start gap-1.5">
                          <Zap className="h-3 w-3 text-amber-400 shrink-0 mt-0.5" />
                          {endpoint.notes}
                        </p>
                      )}

                      {/* Params */}
                      {endpoint.params && endpoint.params.length > 0 && (
                        <div className="mb-3">
                          <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                            Query Parameters
                          </p>
                          <div className="space-y-1">
                            {endpoint.params.map((param) => (
                              <div key={param.name} className="flex items-start gap-2 text-xs">
                                <code className="text-cyan-300 font-mono shrink-0 bg-zinc-800 px-1.5 py-0.5 rounded">
                                  {param.name}
                                </code>
                                <Badge variant="outline" className="border-zinc-700 text-zinc-400 text-[9px] px-1.5 shrink-0 h-fit mt-px">
                                  {param.type}
                                </Badge>
                                {param.required && (
                                  <Badge className="bg-red-500/20 text-red-300 border-red-500/30 text-[9px] px-1 h-fit mt-px">
                                    req
                                  </Badge>
                                )}
                                <span className="text-zinc-400">{param.description}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Body */}
                      {endpoint.body && endpoint.body.length > 0 && (
                        <div className="mb-3">
                          <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                            Request Body (JSON)
                          </p>
                          <div className="space-y-1">
                            {endpoint.body.map((field) => (
                              <div key={field.name} className="flex items-start gap-2 text-xs">
                                <code className="text-emerald-300 font-mono shrink-0 bg-zinc-800 px-1.5 py-0.5 rounded">
                                  {field.name}
                                </code>
                                <Badge variant="outline" className="border-zinc-700 text-zinc-400 text-[9px] px-1.5 shrink-0 h-fit mt-px">
                                  {field.type}
                                </Badge>
                                {field.required && (
                                  <Badge className="bg-red-500/20 text-red-300 border-red-500/30 text-[9px] px-1 h-fit mt-px">
                                    req
                                  </Badge>
                                )}
                                <span className="text-zinc-400">{field.description}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Response */}
                      {endpoint.response && (
                        <div>
                          <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                            Ejemplo de Respuesta
                          </p>
                          <pre className="bg-zinc-800/80 border border-zinc-700/50 rounded-lg p-3 text-[11px] font-mono text-zinc-300 overflow-x-auto max-h-48">
                            {endpoint.response}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )
        })}

        {/* Footer */}
        <div className="text-center py-4 text-xs text-zinc-500">
          <p>NEXUS Sim API — Sistema de Simulación Multi-Agente Colaborativa</p>
          <Link href="/" className="hover:text-emerald-400 transition-colors mt-1 inline-block">
            ← Volver al Dashboard
          </Link>
        </div>
      </main>
    </div>
  )
}
