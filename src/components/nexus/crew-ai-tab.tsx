'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Users, Play, Plus, ChevronRight, CheckCircle2, Clock, Loader2,
  Crown, Search, PenTool, Eye, Code, BarChart3, Zap,
  ArrowRight, Pause, RotateCcw, Sparkles, FileText, Trash2,
} from 'lucide-react'
import {
  type OrchestratorCrew, type OrchestratorTask,
  CREW_TEMPLATES, createCrewFromTemplate, getExecutableTasks,
  executeTask, formatCrewPlan, buildAgentPrompt,
} from '@/lib/orchestrator'
import type { Project } from '@/components/nexus/types'

const ROLE_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  leader: { icon: Crown, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  researcher: { icon: Search, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  writer: { icon: PenTool, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  reviewer: { icon: Eye, color: 'text-rose-400', bg: 'bg-rose-500/10' },
  coder: { icon: Code, color: 'text-violet-400', bg: 'bg-violet-500/10' },
  analyst: { icon: BarChart3, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  executor: { icon: Zap, color: 'text-orange-400', bg: 'bg-orange-500/10' },
}

const TASK_TYPE_COLORS: Record<string, string> = {
  sequential: 'border-blue-500/30 bg-blue-500/5',
  parallel: 'border-emerald-500/30 bg-emerald-500/5',
  delegation: 'border-violet-500/30 bg-violet-500/5',
  review: 'border-amber-500/30 bg-amber-500/5',
  synthesis: 'border-cyan-500/30 bg-cyan-500/5',
}

const STRATEGY_COLORS: Record<string, string> = {
  sequential: 'text-blue-400 border-blue-500/30',
  hierarchical: 'text-amber-400 border-amber-500/30',
  parallel: 'text-emerald-400 border-emerald-500/30',
  delegative: 'text-violet-400 border-violet-500/30',
}

export function CrewAITab({ projectId, project }: { projectId: string; project: Project }) {
  const [crews, setCrews] = useState<OrchestratorCrew[]>([])
  const [selectedCrew, setSelectedCrew] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [templateId, setTemplateId] = useState('research-write')
  const [objective, setObjective] = useState('')
  const [executing, setExecuting] = useState(false)
  const [executionLog, setExecutionLog] = useState<string[]>([])

  // Derive agents from the real project data
  const projectAgents = project.agents.map((pa) => ({
    id: pa.agent.agentId,
    name: pa.agent.name,
    division: pa.agent.division,
    emoji: pa.agent.emoji,
    trustScore: pa.trustScore,
  }))

  const handleCreateCrew = () => {
    if (!objective.trim()) return
    const crew = createCrewFromTemplate(templateId, projectId, projectAgents, objective)
    if (crew) {
      setCrews((prev) => [crew, ...prev])
      setSelectedCrew(crew.id)
      setObjective('')
      setCreating(false)
    }
  }

  const handleExecuteCrew = async (crew: OrchestratorCrew) => {
    setExecuting(true)
    setExecutionLog(['🚀 Iniciando ejecución de crew...'])

    const updatedCrew = { ...crew, status: 'running' as const }
    const updatedTasks = [...updatedCrew.tasks]
    const results: Array<{ taskId: string; result: string }> = []

    // Execute tasks in order of dependencies
    let turn = 0
    while (turn < crew.maxTurns) {
      const executable = getExecutableTasks(updatedCrew)
      if (executable.length === 0) break

      for (const task of executable) {
        const taskIdx = updatedTasks.findIndex((t) => t.id === task.id)
        if (taskIdx === -1) continue

        const agent = updatedCrew.agents.find((a) => a.role === task.assigneeRole) || updatedCrew.agents[0]
        setExecutionLog((prev) => [...prev, `🔄 ${agent.name} (${agent.role}) ejecutando: ${task.description.slice(0, 60)}...`])

        // Simulate execution delay
        await new Promise((r) => setTimeout(r, 800))

        const execResult = await executeTask(task, agent, crew.context)
        updatedTasks[taskIdx] = {
          ...task,
          status: 'completed',
          result: execResult.result,
          tokensUsed: execResult.tokensUsed,
          startedAt: new Date(Date.now() - 2000).toISOString(),
          completedAt: new Date().toISOString(),
        }
        results.push({ taskId: task.id, result: execResult.result })
        setExecutionLog((prev) => [...prev, `✅ ${agent.name} completó tarea ${task.id} (${execResult.tokensUsed} tokens)`])
      }

      turn++
    }

    const completedCrew = {
      ...updatedCrew,
      tasks: updatedTasks,
      status: 'completed' as const,
      completedAt: new Date().toISOString(),
    }

    setCrews((prev) => prev.map((c) => (c.id === crew.id ? completedCrew : c)))
    setSelectedCrew(completedCrew.id)
    setExecutionLog((prev) => [...prev, `🎉 Crew "${crew.name}" completado en ${turn} turnos`])
    setExecuting(false)
  }

  const handleDeleteCrew = (crewId: string) => {
    setCrews((prev) => prev.filter((c) => c.id !== crewId))
    if (selectedCrew === crewId) setSelectedCrew(null)
  }

  const activeCrew = crews.find((c) => c.id === selectedCrew)

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="bg-zinc-900 border-zinc-800 border-l-4 border-l-purple-500">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-purple-500/10">
                <Users className="h-4 w-4 text-purple-400" />
              </div>
              <div>
                <CardTitle className="text-sm font-medium text-zinc-100">CrewAI — Orquestación Multi-Agente</CardTitle>
                <CardDescription className="text-xs text-zinc-400">Crews con roles, jerarquías, delegación y ejecución secuencial/paralela</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-purple-700 text-purple-400 text-[10px]">
                {CREW_TEMPLATES.length} templates
              </Badge>
              <Badge variant="outline" className="border-emerald-700 text-emerald-400 text-[10px]">
                {crews.length} crews
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Templates + Create */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-zinc-400 font-medium mr-1">Templates:</span>
            {CREW_TEMPLATES.map((t) => (
              <Badge
                key={t.id}
                variant="outline"
                className={`cursor-pointer text-[10px] px-2 py-1 transition-colors ${
                  templateId === t.id ? 'border-purple-500 text-purple-300 bg-purple-500/10' : 'border-zinc-700 text-zinc-400 hover:border-zinc-600'
                }`}
                onClick={() => setTemplateId(t.id)}
              >
                {t.name}
              </Badge>
            ))}
            <div className="flex-1" />
            <Button
              size="sm"
              className="h-8 text-[10px] bg-purple-600 hover:bg-purple-700"
              onClick={() => setCreating(!creating)}
            >
              {creating ? <><ChevronRight className="h-3 w-3 mr-1" />Cerrar</> : <><Plus className="h-3 w-3 mr-1" />Crear Crew</>}
            </Button>
          </div>

          {creating && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 space-y-2"
            >
              <Textarea
                placeholder="Describe el objetivo de la crew..."
                className="bg-zinc-800 border-zinc-700 text-xs min-h-[60px]"
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
              />
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-zinc-500">
                  Estrategia: <span className={STRATEGY_COLORS[CREW_TEMPLATES.find((t) => t.id === templateId)?.strategy || 'sequential']}>{CREW_TEMPLATES.find((t) => t.id === templateId)?.strategy}</span>
                  {' · '}{CREW_TEMPLATES.find((t) => t.id === templateId)?.roles.length} roles
                </p>
                <Button size="sm" className="h-7 text-[10px] bg-purple-600 hover:bg-purple-700" onClick={handleCreateCrew} disabled={!objective.trim()}>
                  <Sparkles className="h-3 w-3 mr-1" />Crear
                </Button>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Crew List */}
        <ScrollArea className="max-h-[600px]">
          <div className="space-y-2">
            {crews.length === 0 ? (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="py-8 text-center">
                  <Users className="h-8 w-8 mx-auto mb-2 text-zinc-700" />
                  <p className="text-sm text-zinc-400">Sin crews creados</p>
                  <p className="text-xs text-zinc-600 mt-1">Seleccioná un template y definí un objetivo para crear tu primera crew</p>
                </CardContent>
              </Card>
            ) : (
              crews.map((crew) => (
                <motion.div key={crew.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                  <Card
                    className={`cursor-pointer transition-colors ${selectedCrew === crew.id ? 'bg-zinc-800 border-purple-500/50' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}`}
                    onClick={() => { setSelectedCrew(crew.id); if (crew.status === 'completed') setExecutionLog([]) }}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-zinc-100">{crew.name}</span>
                            <Badge variant="outline" className={`text-[9px] ${STRATEGY_COLORS[crew.strategy]}`}>
                              {crew.strategy}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-zinc-400 line-clamp-2">{crew.description}</p>
                          <div className="flex items-center gap-2 mt-2">
                            {crew.agents.slice(0, 4).map((a) => {
                              const rc = ROLE_CONFIG[a.role]
                              const Icon = rc?.icon || Users
                              return (
                                <Badge key={a.id} variant="outline" className={`${rc?.bg} ${rc?.color} text-[8px] px-1.5`}>
                                  <Icon className="h-2.5 w-2.5 mr-0.5" />{a.role}
                                </Badge>
                              )
                            })}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant="outline" className={`text-[9px] ${
                            crew.status === 'completed' ? 'border-emerald-500/30 text-emerald-400' :
                            crew.status === 'running' ? 'border-amber-500/30 text-amber-400' :
                            'border-zinc-700 text-zinc-400'
                          }`}>
                            {crew.status === 'completed' ? <><CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />Done</> :
                             crew.status === 'running' ? <><Loader2 className="h-2.5 w-2.5 mr-0.5 animate-spin" />Running</> :
                             <><Clock className="h-2.5 w-2.5 mr-0.5" />Draft</>}
                          </Badge>
                          <div className="flex gap-1">
                            {crew.status === 'draft' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 text-purple-400 hover:text-purple-300"
                                onClick={(e) => { e.stopPropagation(); handleExecuteCrew(crew) }}
                                disabled={executing}
                              >
                                <Play className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-zinc-600 hover:text-red-400"
                              onClick={(e) => { e.stopPropagation(); handleDeleteCrew(crew.id) }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Crew Detail */}
        <div className="space-y-3">
          {activeCrew ? (
            <>
              {/* Task Plan */}
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 text-purple-400" />
                    Plan de Tareas
                    <Badge variant="outline" className="text-[9px] border-zinc-700 text-zinc-400 ml-auto">
                      {activeCrew.tasks.filter((t) => t.status === 'completed').length}/{activeCrew.tasks.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {activeCrew.tasks.map((task, i) => {
                    const rc = ROLE_CONFIG[task.assigneeRole]
                    const Icon = rc?.icon || Users
                    const isCompleted = task.status === 'completed'
                    const isRunning = task.status === 'running'
                    return (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        <div className={`p-2 rounded-lg border ${TASK_TYPE_COLORS[task.type] || 'border-zinc-800'} ${isCompleted ? 'opacity-60' : ''}`}>
                          <div className="flex items-center gap-2">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${isCompleted ? 'bg-emerald-500/20 text-emerald-400' : isRunning ? 'bg-amber-500/20 text-amber-400' : 'bg-zinc-800 text-zinc-400'}`}>
                              {isCompleted ? '✓' : task.id.replace('task-', '')}
                            </div>
                            <Icon className={`h-3 w-3 ${rc?.color}`} />
                            <span className="text-[11px] text-zinc-300 flex-1">{task.description.slice(0, 60)}...</span>
                            {task.requireApproval && <span className="text-[8px] text-amber-400">⚠️</span>}
                          </div>
                          {task.dependsOn && task.dependsOn.length > 0 && (
                            <div className="flex items-center gap-1 mt-1 ml-7">
                              <ArrowRight className="h-2.5 w-2.5 text-zinc-600" />
                              <span className="text-[9px] text-zinc-500">deps: {task.dependsOn.join(', ')}</span>
                            </div>
                          )}
                          {isCompleted && task.result && (
                            <div className="mt-1.5 ml-7 p-1.5 rounded bg-zinc-800/50 border border-zinc-700/50">
                              <p className="text-[9px] text-zinc-400 line-clamp-2">{task.result.slice(0, 120)}</p>
                              <span className="text-[8px] text-zinc-600">{task.tokensUsed} tokens</span>
                            </div>
                          )}
                        </div>
                        {i < activeCrew.tasks.length - 1 && <div className="flex justify-center"><ArrowRight className="h-3 w-3 text-zinc-700 rotate-90" /></div>}
                      </motion.div>
                    )
                  })}
                </CardContent>
              </Card>

              {/* Execution Log */}
              {executionLog.length > 0 && (
                <Card className="bg-zinc-900 border-zinc-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <RotateCcw className="h-3.5 w-3.5 text-emerald-400" />
                      Execution Log
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="max-h-[200px]">
                      <div className="space-y-1">
                        {executionLog.map((log, i) => (
                          <motion.p
                            key={i}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-[10px] text-zinc-400 font-mono leading-relaxed"
                          >
                            {log}
                          </motion.p>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}

              {/* Execute Button */}
              {activeCrew.status === 'draft' && (
                <Button
                  className="w-full bg-purple-600 hover:bg-purple-700 text-sm"
                  onClick={() => handleExecuteCrew(activeCrew)}
                  disabled={executing}
                >
                  {executing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Ejecutando...</> : <><Play className="h-4 w-4 mr-2" />Ejecutar Crew</>}
                </Button>
              )}
            </>
          ) : (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="py-12 text-center">
                <Users className="h-8 w-8 mx-auto mb-2 text-zinc-700" />
                <p className="text-sm text-zinc-400">Seleccioná o creá una crew</p>
                <p className="text-xs text-zinc-600 mt-1">El plan de tareas y ejecución aparecen acá</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
