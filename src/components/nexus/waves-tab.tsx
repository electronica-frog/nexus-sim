'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Cpu, Play, Loader2, Rocket, Brain, Waves, Clock, X,
  Gauge, Calendar, MessageSquare, CheckCircle2, ExternalLink, Plus, ClipboardList,
} from 'lucide-react'
import { WAVE_TYPES, WAVE_COLOR_MAP, WAVE_DOT_COLOR, STATUS_COLOR_MAP, MOOD_CONFIG, PIPELINE_STEPS } from '@/components/nexus/constants'
import { AgentCard, LiveAgentCard } from '@/components/nexus/agent-card'
import type { Project, Wave, LiveAgentState } from '@/components/nexus/types'

interface WavesTabProps {
  project: Project
  wavePrompt: string
  setWavePrompt: (v: string) => void
  waveType: string
  setWaveType: (v: string) => void
  selectedAgentIds: string[]
  runningWave: boolean
  runningPipeline: boolean
  pipelineStep: number
  pipelineComplete: boolean
  liveAgents: LiveAgentState[]
  liveComplete: boolean
  liveSynthesis: string | null
  selectedWave: Wave | null
  setSelectedWave: (w: Wave | null) => void
  dialogWave: Wave | null
  setDialogWave: (w: Wave | null) => void
  specCreating: boolean
  waveSpecLink: string | null
  setWaveSpecLink: (v: string | null) => void
  toggleAgent: (id: string) => void
  runWaveStream: () => void
  runPipelineStream: () => void
  createSpecFromWave: (w: Wave) => void
}

export function WavesTab({
  project,
  wavePrompt,
  setWavePrompt,
  waveType,
  setWaveType,
  selectedAgentIds,
  runningWave,
  runningPipeline,
  pipelineStep,
  pipelineComplete,
  liveAgents,
  liveComplete,
  liveSynthesis,
  selectedWave,
  setSelectedWave,
  dialogWave,
  setDialogWave,
  specCreating,
  waveSpecLink,
  setWaveSpecLink,
  toggleAgent,
  runWaveStream,
  runPipelineStream,
  createSpecFromWave,
}: WavesTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Cpu className="h-4 w-4 text-emerald-400" />Simulación de Oleada</CardTitle>
            <CardDescription className="text-zinc-300">Describe un problema o tema y selecciona los agentes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea placeholder="Ejemplo: ¿Cómo deberíamos estructurar la autenticación en nuestra nueva aplicación móvil?" value={wavePrompt} onChange={(e) => setWavePrompt(e.target.value)} className="bg-zinc-800 border-zinc-700 text-sm min-h-[100px] resize-none" />
            <div>
              <p className="text-xs text-zinc-300 mb-2">Tipo de Oleada</p>
              <div className="flex flex-wrap gap-2">
                {WAVE_TYPES.map((wt) => {
                  const Icon = wt.icon
                  const isSelected = waveType === wt.value
                  return (
                    <Button key={wt.value} variant={isSelected ? 'default' : 'outline'} size="sm" onClick={() => setWaveType(wt.value)}
                      className={isSelected ? `${WAVE_COLOR_MAP[wt.value].split(' ')[0]} bg-transparent border` : 'border-zinc-700 text-zinc-200 hover:text-zinc-200'}>
                      <Icon className="h-3.5 w-3.5 mr-1.5" />{wt.label}
                    </Button>
                  )
                })}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-zinc-300">Agentes seleccionados: {selectedAgentIds.length}</p>
              </div>
              <ScrollArea className="max-h-40">
                <div className="space-y-1">
                  {project.agents.filter((pa) => {
                    const divs: Record<string, string[]> = { brainstorm: ['product', 'marketing', 'design'], critique: ['testing', 'specialized', 'engineering'], synthesize: ['specialized', 'project-management', 'product'], execute: ['engineering'], quality_gate: ['testing'] }
                    const d = divs[waveType] || []
                    if (waveType === 'quality_gate') return pa.agent.agentId.includes('reality-checker') || pa.agent.agentId.includes('evidence-collector')
                    return d.includes(pa.agent.division)
                  }).map((pa) => (
                    <label key={pa.id} className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${selectedAgentIds.includes(pa.id) ? 'bg-zinc-800 border border-zinc-700' : 'hover:bg-zinc-800/50'}`}>
                      <Checkbox checked={selectedAgentIds.includes(pa.id)} onCheckedChange={() => toggleAgent(pa.id)} className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600" />
                      <span className="text-lg">{pa.agent.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{pa.agent.name}</p>
                        <p className="text-xs text-zinc-300">{pa.agent.division}</p>
                      </div>
                      <div className={`w-2 h-2 rounded-full ${STATUS_COLOR_MAP[pa.status] || 'bg-zinc-500'}`} />
                    </label>
                  ))}
                </div>
              </ScrollArea>
            </div>
            <div className="flex gap-2">
              <Button onClick={runWaveStream} disabled={runningWave || runningPipeline || !wavePrompt.trim() || selectedAgentIds.length === 0} className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1 sm:flex-none" size="lg">
                {runningWave ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Ejecutando...</>) : (<><Play className="mr-2 h-4 w-4" />Ejecutar Oleada</>)}
              </Button>
              <Button onClick={runPipelineStream} disabled={runningWave || runningPipeline || !wavePrompt.trim()} variant="outline" size="lg" className="border-amber-600 text-amber-400 hover:bg-amber-600/10 flex-1 sm:flex-none">
                {runningPipeline ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Pipeline...</>) : (<><Rocket className="mr-2 h-4 w-4" />Pipeline Completo (5 pasos)</>)}
              </Button>
            </div>
            {project.specs.length > 0 && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-zinc-200">Vincular a Spec:</span>
                <Select value={waveSpecLink || 'none'} onValueChange={(v) => setWaveSpecLink(v === 'none' ? null : v)}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-[10px] h-6 w-auto max-w-[200px]">
                    <SelectValue placeholder="Ninguna" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ninguna</SelectItem>
                    {project.specs.filter((s) => s.status === 'active').map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pipeline Progress */}
        {(runningPipeline || pipelineComplete) && (
          <Card className="bg-zinc-900 border-amber-800/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-amber-400">
                <Rocket className="h-4 w-4" />Pipeline Automático (5 pasos)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                {PIPELINE_STEPS.map((step, idx) => {
                  const StepIcon = step.icon
                  const isActive = pipelineStep === idx + 1 && !pipelineComplete
                  const isDone = pipelineStep > idx + 1 || pipelineComplete
                  return (
                    <React.Fragment key={step.type}>
                      <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${isDone ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : isActive ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' : 'bg-zinc-800 text-zinc-200 border border-zinc-700'}`}>
                        <StepIcon className="h-3 w-3" />
                        {step.label.split(':')[0]}
                        {isActive && <Loader2 className="h-3 w-3 animate-spin ml-1" />}
                        {isDone && <CheckCircle2 className="h-3 w-3 ml-1" />}
                      </div>
                      {idx < 4 && <div className={`flex-1 h-px ${pipelineStep > idx + 1 || pipelineComplete ? 'bg-emerald-500' : 'bg-zinc-700'}`} />}
                    </React.Fragment>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Live Feed */}
        {(runningWave || runningPipeline) && (
          <Card className="bg-zinc-900 border-emerald-800/30">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                  <CardTitle className="text-sm text-emerald-400">
                    {runningPipeline ? `Pipeline — Paso ${pipelineStep}/5` : 'Ejecutando Oleada...'}
                  </CardTitle>
                </div>
                <Badge variant="outline" className="border-zinc-700 text-zinc-200 text-[10px] ml-auto">
                  {liveAgents.filter((a) => a.status === 'done').length}/{liveAgents.length} agentes
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[500px]">
                <div className="space-y-3">
                  {liveAgents.map((agent, idx) => (
                    <LiveAgentCard key={agent.agentId} agent={agent} index={idx} />
                  ))}
                  {liveAgents.length === 0 && (
                    <div className="text-center py-8">
                      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: 'linear' }} className="inline-block">
                        <Cpu className="h-8 w-8 text-zinc-200" />
                      </motion.div>
                      <p className="text-xs text-zinc-200 mt-2">Preparando agentes...</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
              {liveComplete && liveSynthesis && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
                  <div className="p-3 rounded-lg bg-cyan-500/5 border border-cyan-800/30">
                    <h4 className="text-sm font-medium text-cyan-400 flex items-center gap-2 mb-2"><Brain className="h-4 w-4" />{runningPipeline ? 'Resumen Ejecutivo del Pipeline' : 'Síntesis'}</h4>
                    <p className="text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap">{liveSynthesis.slice(0, 1000)}</p>
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Selected Wave Detail */}
        {!runningWave && !runningPipeline && selectedWave && selectedWave.responses.length > 0 && (
          <AnimatePresence mode="wait">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <Badge className={`${WAVE_COLOR_MAP[selectedWave.type]} border`}>{selectedWave.type}</Badge>
                    <CardTitle className="text-base">Oleada #{selectedWave.number}</CardTitle>
                    <div className="ml-auto flex items-center gap-2">
                      <Badge variant="outline" className="border-zinc-700 text-zinc-200 text-[10px]">
                        <MessageSquare className="h-2.5 w-2.5 mr-1" />{selectedWave.responses.length} respuestas
                      </Badge>
                      {selectedWave.completedAt && (
                        <span className="text-[10px] text-zinc-300 flex items-center gap-1">
                          <Calendar className="h-2.5 w-2.5" />
                          {new Date(selectedWave.completedAt).toLocaleString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-zinc-300 hover:text-zinc-100" onClick={() => setSelectedWave(null)} title="Cerrar">
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription className="text-zinc-200 text-sm mt-2">{selectedWave.prompt}</CardDescription>
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="flex items-center gap-3 p-2.5 rounded-lg bg-zinc-800/50">
                    <Gauge className="h-3.5 w-3.5 text-zinc-300" />
                    <span className="text-xs text-zinc-300">Confianza Promedio:</span>
                    <Progress value={(selectedWave.responses.reduce((s, r) => s + r.confidence, 0) / selectedWave.responses.length) * 100} className="flex-1 h-2" />
                    <span className="text-xs font-medium">{Math.round((selectedWave.responses.reduce((s, r) => s + r.confidence, 0) / selectedWave.responses.length) * 100)}%</span>
                  </div>
                </CardContent>
              </Card>
              <ScrollArea className="max-h-[500px]">
                <div className="space-y-3">
                  {selectedWave.responses.map((response, index) => {
                    const agentName = response.projectAgent?.agent?.name || 'Agente'
                    const agentEmoji = response.projectAgent?.agent?.emoji || '🤖'
                    const agentDiv = response.projectAgent?.agent?.division || ''
                    const moodCfg = MOOD_CONFIG[response.mood] || MOOD_CONFIG.neutral
                    const MoodIcon = moodCfg.icon
                    return (
                      <motion.div key={response.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }}>
                        <Card className="bg-zinc-900 border-zinc-800 overflow-hidden">
                          <CardHeader className="pb-2 pt-3 px-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-sm">{agentEmoji}</div>
                                <div>
                                  <p className="text-sm font-medium">{agentName}</p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <Badge variant="outline" className="border-zinc-700 text-zinc-300 text-[9px] px-1">{agentDiv}</Badge>
                                    <span className={`flex items-center gap-0.5 text-[10px] ${moodCfg.color}`}><MoodIcon className="h-2.5 w-2.5" />{moodCfg.label}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-zinc-300">Confianza</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <Progress value={response.confidence * 100} className="w-16 h-1.5" />
                                  <span className="text-[10px] text-zinc-200">{Math.round(response.confidence * 100)}%</span>
                                </div>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="px-4 pb-3"><p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{response.content}</p></CardContent>
                        </Card>
                      </motion.div>
                    )
                  })}
                </div>
              </ScrollArea>
              {selectedWave.result && (
                <Card className="bg-zinc-900 border-cyan-800/50">
                  <CardHeader className="pb-2 pt-3 px-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2 text-cyan-400"><Brain className="h-4 w-4" />Síntesis</CardTitle>
                      <Button size="sm" variant="ghost" onClick={() => createSpecFromWave(selectedWave)} disabled={specCreating} className="text-cyan-300 hover:text-cyan-200 hover:bg-cyan-400/10 h-7 text-xs gap-1">
                        {specCreating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                        Crear Spec
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-3"><p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{selectedWave.result}</p></CardContent>
                </Card>
              )}
              {!selectedWave.result && selectedWave.status === 'completed' && (
                <Button size="sm" variant="ghost" onClick={() => createSpecFromWave(selectedWave)} disabled={specCreating} className="w-full text-cyan-300 hover:text-cyan-200 hover:bg-cyan-400/10 h-8 text-xs gap-1 border border-dashed border-zinc-800 rounded-lg mt-2">
                  {specCreating ? <Loader2 className="h-3 w-3 animate-spin" /> : <ClipboardList className="h-3 w-3" />}
                  Crear Spec desde esta oleada
                </Button>
              )}
            </motion.div>
          </AnimatePresence>
        )}

        {!runningWave && !runningPipeline && !selectedWave && (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="py-12 text-center">
              <MessageSquare className="h-10 w-10 mx-auto mb-3 text-zinc-700" />
              <p className="text-sm text-zinc-300">Selecciona una oleada del historial</p>
              <p className="text-xs text-zinc-200 mt-1">Las respuestas de los agentes aparecerán aquí</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right Column: Wave Timeline */}
      <div className="space-y-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-zinc-200 flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" />Historial de Oleadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {project.waves.length === 0 ? (
              <div className="text-center py-8 text-zinc-200">
                <Waves className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs">Sin oleadas</p>
                <p className="text-[10px] text-zinc-700 mt-1">Ejecuta tu primera oleada</p>
              </div>
            ) : (
              <ScrollArea className="max-h-[500px] lg:max-h-[700px]">
                <div className="relative pl-5">
                  <div className="absolute left-[7px] top-2 bottom-2 w-px bg-zinc-800" />
                  <div className="space-y-2">
                    {project.waves.map((wave, idx) => {
                      const isSelected = selectedWave?.id === wave.id
                      return (
                        <motion.div
                          key={wave.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          className="relative cursor-pointer group"
                          onClick={() => setSelectedWave(wave)}
                        >
                          <div className={`absolute -left-5 top-2.5 w-2.5 h-2.5 rounded-full border-2 border-zinc-950 ${isSelected ? 'ring-2 ring-offset-1 ring-offset-zinc-950 ring-zinc-400' : ''} ${WAVE_DOT_COLOR[wave.type] || 'bg-zinc-500'}`} />
                          <div className={`p-2 rounded-md border transition-colors ${isSelected ? 'bg-zinc-800/60 border-zinc-600' : 'bg-zinc-800/30 border-zinc-800 group-hover:border-zinc-700'}`}>
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <Badge variant="outline" className={`${WAVE_COLOR_MAP[wave.type]} text-[9px] px-1`}>{wave.type}</Badge>
                              <span className="text-[10px] font-medium">#{wave.number}</span>
                              {isSelected && <span className="text-[9px] text-emerald-400 ml-auto">● Activa</span>}
                            </div>
                            <p className="text-[10px] text-zinc-300 truncate">{wave.prompt.slice(0, 50)}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[9px] text-zinc-200">{wave.responses.length} resp</span>
                              <span className="text-[9px] text-zinc-700">·</span>
                              <span className="text-[9px] text-zinc-200">{new Date(wave.createdAt).toLocaleDateString('es', { day: '2-digit', month: 'short' })}</span>
                              <button
                                className="ml-auto text-[9px] text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => { e.stopPropagation(); setDialogWave(wave) }}
                                title="Ver en diálogo completo"
                              >
                                <ExternalLink className="h-2.5 w-2.5" />Detalle
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
