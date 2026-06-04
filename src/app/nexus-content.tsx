'use client'

import React, { Suspense } from 'react'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Activity, Users, Cpu, Search, Play, Loader2,
  Target, CheckCircle2, AlertTriangle, MessageSquare,
  BarChart3, FileText, ChevronRight, ChevronLeft,
  RefreshCw, Database, Clock, Filter,
  ThumbsUp, ThumbsDown, Waves, Rocket, ChevronDown, ChevronUp,
  TrendingUp, Gauge, Calendar, LayoutGrid, X, ExternalLink, Handshake,
  ArrowUpDown, Trophy, Medal, ClipboardList, Kanban, Plus, Trash2,
  Star, Flame,
  Download, BookOpen,
  HeartPulse, Newspaper, History, ScrollText, Brain,
} from 'lucide-react'

// Extracted modules
import { WAVE_TYPES, WAVE_COLOR_MAP, WAVE_DOT_COLOR, STATUS_COLOR_MAP, MOOD_CONFIG, PROPOSAL_STATUS_MAP, MEMORY_TYPE_COLORS, DIVISION_COLORS, PIPELINE_STEPS, SPEC_PHASE_CONFIG, SPEC_PRIORITY_CONFIG, SPEC_PHASES, TRUST_COLOR, TRUST_BAR_COLOR, TRUST_LABEL } from '@/components/nexus/constants'
import { useNexusData } from '@/components/nexus/use-nexus-data'
import { StatCard } from '@/components/nexus/stat-card'
import { AgentCard, LiveAgentCard } from '@/components/nexus/agent-card'
const WaveDetailDialog = dynamic(() => import('@/components/nexus/wave-detail-dialog').then(m => ({ default: m.WaveDetailDialog })), { ssr: false })
// Lazy-loaded heavy tabs to reduce compilation memory
const DashboardTab = dynamic(() => import('@/components/nexus/dashboard-tab').then(m => ({ default: m.DashboardTab })), { loading: () => <div className="h-96 bg-zinc-900 rounded-lg animate-pulse" />, ssr: false })

// ===== Main Component =====
export default function NexusContent() {
  const {
    project, loading, seeding, activeTab, setActiveTab,
    wavePrompt, setWavePrompt, waveType, setWaveType,
    selectedAgentIds, runningWave, agentFilter, setAgentFilter,
    agentSearch, setAgentSearch, selectedAgent, setSelectedAgent,
    memoryAgentFilter, setMemoryAgentFilter,
    selectedWave, setSelectedWave, dialogWave, setDialogWave,
    sharedLearnings, sharedLearningsExpanded, setSharedLearningsExpanded,
    memorySearchQuery, setMemorySearchQuery, memorySearchResults,
    memorySearching, showMemorySearch, setShowMemorySearch,
    liveAgents, liveComplete, liveSynthesis,
    runningPipeline, pipelineStep, pipelineComplete,
    benchMetrics, benchAggregates, benchLoading, benchDivisionFilter,
    setBenchDivisionFilter, benchSortField, benchSortDir, benchSelectedAgent,
    setBenchSelectedAgent,
    specTitle, setSpecTitle, specDescription, setSpecDescription,
    specPriority, setSpecPriority, specCreating, specView, setSpecView,
    selectedSpec, setSelectedSpec, waveSpecLink, setWaveSpecLink,
    agentSkills,
    dashboard, systemHealth, activityLogs, waveStats,
    divisions, filteredAgents, filteredMemories,
    avgConfidence, moodCounts, topTrustedAgents, avgTrust,
    handleSeed, toggleAgent,
    runWaveStream, runPipelineStream,
    updateProposalStatus, createSpec, updateSpecPhase,
    updateSpecPriority, deleteSpec, createSpecFromWave,
    exportData, fetchBenchMetrics, deleteSkill, handleMemorySearch,
    toggleBenchSort, getFilteredSortedMetrics,
  } = useNexusData()

  // ===== Loading State =====
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100">
        <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-4">
          <Skeleton className="h-12 w-64 bg-zinc-800" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 bg-zinc-800 rounded-lg" />)}
          </div>
          <Skeleton className="h-96 bg-zinc-800 rounded-lg" />
        </div>
      </div>
    )
  }

  // ===== No Data State =====
  if (!project) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <Card className="bg-zinc-900 border-zinc-800 max-w-md w-full mx-4">
          <CardContent className="p-8 text-center space-y-4">
            <div className="text-6xl mb-4">🧬</div>
            <h2 className="text-2xl font-bold">NEXUS Sim</h2>
            <p className="text-zinc-200">Sistema de Simulación Multi-Agente Colaborativa</p>
            <Separator className="bg-zinc-800" />
            <p className="text-sm text-zinc-300">Presiona el botón para cargar los agentes desde The Agency</p>
            <Button onClick={handleSeed} disabled={seeding} className="bg-emerald-600 hover:bg-emerald-700 text-white w-full" size="lg">
              {seeding ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Cargando Agentes...</>) : (<><Database className="mr-2 h-4 w-4" />Inicializar NEXUS</>)}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ===== Main Layout =====
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🧬</div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">NEXUS Sim</h1>
              <p className="text-xs text-zinc-300 hidden sm:block">Simulación Multi-Agente</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-zinc-700 text-zinc-300 text-xs">{project.agents.length} agentes</Badge>
            <Badge variant="outline" className="border-emerald-700 text-emerald-300 text-xs">
              <Activity className="h-3 w-3 mr-1" />{project.status}
            </Badge>
            <Button variant="ghost" size="sm" onClick={handleSeed} disabled={seeding} className="text-zinc-200 hover:text-zinc-100">
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${seeding ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Re-sembrar</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-6 py-4 md:py-6">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            <Tabs value={activeTab} onValueChange={(v) => {
              setActiveTab(v)
            }}>
              <TabsList className="bg-zinc-900 border border-zinc-800 mb-6">
                <TabsTrigger value="dashboard" className="data-[state=active]:bg-zinc-800"><BarChart3 className="h-3.5 w-3.5 mr-1.5" />Dashboard</TabsTrigger>
                <TabsTrigger value="agents" className="data-[state=active]:bg-zinc-800"><Users className="h-3.5 w-3.5 mr-1.5" />Agentes</TabsTrigger>
                <TabsTrigger value="waves" className="data-[state=active]:bg-zinc-800"><Waves className="h-3.5 w-3.5 mr-1.5" />Oleadas</TabsTrigger>
                <TabsTrigger value="memory" className="data-[state=active]:bg-zinc-800"><FileText className="h-3.5 w-3.5 mr-1.5" />Memoria</TabsTrigger>
                <TabsTrigger value="specs" className="data-[state=active]:bg-zinc-800"><ClipboardList className="h-3.5 w-3.5 mr-1.5" />Specs</TabsTrigger>
                <TabsTrigger value="proposals" className="data-[state=active]:bg-zinc-800"><Target className="h-3.5 w-3.5 mr-1.5" />Propuestas</TabsTrigger>
              </TabsList>

              {/* ===== DASHBOARD TAB ===== */}
              <TabsContent value="dashboard" className="space-y-6">
                <DashboardTab
                  project={project}
                  dashboard={dashboard}
                  agentSkills={agentSkills}
                  avgConfidence={avgConfidence}
                  moodCounts={moodCounts}
                  topTrustedAgents={topTrustedAgents}
                  avgTrust={avgTrust}
                  benchMetrics={benchMetrics}
                  benchAggregates={benchAggregates}
                  benchLoading={benchLoading}
                  benchDivisionFilter={benchDivisionFilter}
                  setBenchDivisionFilter={setBenchDivisionFilter}
                  benchSortField={benchSortField}
                  benchSortDir={benchSortDir}
                  benchSelectedAgent={benchSelectedAgent}
                  setBenchSelectedAgent={setBenchSelectedAgent}
                  divisions={divisions}
                  setActiveTab={setActiveTab}
                  setWaveType={setWaveType}
                  fetchBenchMetrics={fetchBenchMetrics}
                  exportData={exportData}
                  setSelectedWave={setSelectedWave}
                  toggleBenchSort={toggleBenchSort}
                  getFilteredSortedMetrics={getFilteredSortedMetrics}
                />
              </TabsContent>

              {/* ===== AGENTS TAB ===== */}
              <TabsContent value="agents" className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-300" />
                    <Input placeholder="Buscar agentes..." value={agentSearch} onChange={(e) => setAgentSearch(e.target.value)} className="bg-zinc-900 border-zinc-800 pl-9 text-sm" />
                  </div>
                  <Select value={agentFilter} onValueChange={setAgentFilter}>
                    <SelectTrigger className="bg-zinc-900 border-zinc-800 w-full sm:w-48 text-sm">
                      <Filter className="h-3.5 w-3.5 mr-1.5" /><SelectValue placeholder="División" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      <SelectItem value="all">Todas</SelectItem>
                      {divisions.map((div) => <SelectItem key={div} value={div}>{div}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {filteredAgents.map((pa, index) => (
                    <motion.div key={pa.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}>
                      <AgentCard projectAgent={pa} onClick={() => setSelectedAgent(pa.agent)} skillCount={agentSkills.filter((s) => s.agentId === pa.agentId).length} />
                    </motion.div>
                  ))}
                </div>
                {filteredAgents.length === 0 && (
                  <div className="text-center py-12 text-zinc-300">
                    <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium">No se encontraron agentes</p>
                    <p className="text-xs text-zinc-200 mt-1">Intenta con otro filtro o término de búsqueda</p>
                  </div>
                )}
                <Dialog open={!!selectedAgent} onOpenChange={() => setSelectedAgent(null)}>
                  <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg max-h-[80vh]">
                    {selectedAgent && (
                      <>
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2"><span className="text-2xl">{selectedAgent.emoji}</span><span>{selectedAgent.name}</span></DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline" className="border-zinc-700">{selectedAgent.division}</Badge>
                            <Badge variant="outline" className="border-zinc-700"><span className="w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: selectedAgent.color === 'cyan' ? '#06b6d4' : selectedAgent.color === 'red' ? '#ef4444' : selectedAgent.color === 'purple' ? '#a855f7' : selectedAgent.color === 'amber' ? '#f59e0b' : selectedAgent.color === 'emerald' ? '#10b981' : '#6b7280' }} />{selectedAgent.color}</Badge>
                          </div>
                          {(() => {
                            const pa = project.agents.find((p) => p.agentId === selectedAgent.id)
                            const trust = pa?.trustScore ?? 0.5
                            return (
                              <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-800">
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-xs text-zinc-200 flex items-center gap-1.5"><Handshake className="h-3.5 w-3.5" />Confiabilidad</span>
                                  <div className="flex items-center gap-2">
                                    <span className={`text-sm font-bold ${TRUST_COLOR(trust)}`}>{Math.round(trust * 100)}%</span>
                                    <Badge variant="outline" className={`border-current/20 ${TRUST_COLOR(trust)} text-[10px]`}>{TRUST_LABEL(trust)}</Badge>
                                  </div>
                                </div>
                                <Progress value={trust * 100} className="h-2" />
                              </div>
                            )
                          })()}
                          <Separator className="bg-zinc-800" />
                          <div>
                            <h4 className="text-sm font-medium text-zinc-200 mb-2">Personalidad</h4>
                            <ScrollArea className="max-h-48"><p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{selectedAgent.personality?.slice(0, 2000) || ''}</p></ScrollArea>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-zinc-200 mb-2 flex items-center gap-1.5">
                              <Flame className="h-3.5 w-3.5 text-orange-400" />Habilidades ({agentSkills.filter((s) => s.agentId === selectedAgent.id).length})
                            </h4>
                            <ScrollArea className="max-h-40">
                              {agentSkills.filter((s) => s.agentId === selectedAgent.id).length === 0 ? (
                                <div className="text-center py-3">
                                  <p className="text-xs text-zinc-200">Sin habilidades aprendidas aún</p>
                                  <p className="text-[10px] text-zinc-300 mt-1">Las habilidades se extraen automáticamente de respuestas entusiastas con alta confianza</p>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {agentSkills.filter((s) => s.agentId === selectedAgent.id).slice(0, 8).map((s) => (
                                    <div key={s.id} className="p-2.5 rounded-lg bg-orange-500/5 border border-orange-500/20">
                                      <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-1.5">
                                          <Star className="h-3 w-3 text-orange-400" />
                                          <span className="text-xs font-medium text-orange-300">{s.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-[10px] text-zinc-300">{s.timesUsed}x</span>
                                          <button onClick={() => deleteSkill(s.id)} className="text-zinc-400 hover:text-red-400 transition-colors" title="Eliminar habilidad">
                                            <Trash2 className="h-3 w-3" />
                                          </button>
                                        </div>
                                      </div>
                                      <p className="text-[11px] text-zinc-300 mb-1.5">{s.description}</p>
                                      <div className="flex items-center gap-1.5">
                                        <Progress value={Math.min(s.quality * 100, 100)} className={`h-1.5 ${s.quality >= 0.7 ? '[&>div]:bg-orange-500' : s.quality >= 0.4 ? '[&>div]:bg-amber-500' : '[&>div]:bg-zinc-500'}`} />
                                        <span className="text-[10px] text-zinc-300">{Math.round(s.quality * 100)}%</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </ScrollArea>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-zinc-200 mb-2">Memorias ({project.memories.filter((m) => m.agentId === selectedAgent.id).length})</h4>
                            <ScrollArea className="max-h-32">
                              {project.memories.filter((m) => m.agentId === selectedAgent.id).length === 0 ? (
                                <p className="text-xs text-zinc-200">Sin memorias aún</p>
                              ) : (
                                <div className="space-y-2">
                                  {project.memories.filter((m) => m.agentId === selectedAgent.id).slice(0, 5).map((m) => (
                                    <div key={m.id} className="p-2 rounded bg-zinc-800/50 border border-zinc-800">
                                      <div className="flex items-center gap-2 mb-1">
                                        <Badge className={`text-[10px] px-1.5 ${MEMORY_TYPE_COLORS[m.type] || ''}`}>{m.type}</Badge>
                                        <span className="text-[10px] text-zinc-300">{new Date(m.createdAt).toLocaleDateString('es')}</span>
                                      </div>
                                      <p className="text-xs text-zinc-200">{m.content.slice(0, 120)}</p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </ScrollArea>
                          </div>
                        </div>
                      </>
                    )}
                  </DialogContent>
                </Dialog>
              </TabsContent>

              {/* ===== WAVE SIMULATION TAB ===== */}
              <TabsContent value="waves" className="space-y-6">
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
              </TabsContent>

              {/* ===== MEMORY TAB ===== */}
              <TabsContent value="memory" className="space-y-4">
                <Card className="bg-zinc-900 border-zinc-800 border-l-4 border-l-emerald-500">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-emerald-500/10">
                          <Brain className="h-4 w-4 text-emerald-400" />
                        </div>
                        <div>
                          <CardTitle className="text-sm font-medium text-zinc-100">Aprendizaje Compartido entre Agentes</CardTitle>
                          <CardDescription className="text-xs text-zinc-400">Insights importantes (importancia &gt;70%) de todas las oleadas</CardDescription>
                        </div>
                      </div>
                      {sharedLearnings.length > 0 && (
                        <Badge variant="outline" className="border-emerald-700 text-emerald-400 text-[10px]">{sharedLearnings.length} aprendizajes</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {sharedLearnings.length === 0 ? (
                      <div className="text-center py-6">
                        <Brain className="h-8 w-8 mx-auto mb-2 text-zinc-700" />
                        <p className="text-xs text-zinc-400">Sin aprendizajes compartidos aún. Ejecuta oleadas para generar memoria semántica.</p>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-2">
                          {sharedLearnings
                            .slice(0, sharedLearningsExpanded ? sharedLearnings.length : 5)
                            .map((learning, idx) => {
                              const waveTypeKey = learning.waveType || 'unknown'
                              return (
                                <motion.div
                                  key={learning.id}
                                  initial={{ opacity: 0, y: 5 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: idx * 0.03 }}
                                  className="flex items-start gap-2.5 p-2.5 rounded-lg bg-zinc-800/50 border border-zinc-800 hover:border-zinc-700 transition-colors"
                                >
                                  <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                                    <span className="text-base">{learning.agentEmoji}</span>
                                    <span className="text-[10px] font-medium text-zinc-300">{learning.agentName}</span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs text-zinc-200 leading-relaxed line-clamp-2">{learning.content.slice(0, 200)}</p>
                                    <div className="flex items-center gap-2 mt-1.5">
                                      <Badge variant="outline" className={`${WAVE_COLOR_MAP[waveTypeKey] || 'text-zinc-300 bg-zinc-800 border-zinc-700'} text-[9px] px-1.5`}>
                                        {learning.waveType}
                                      </Badge>
                                      {learning.tags.slice(0, 3).map((tag) => (
                                        <Badge key={tag} variant="outline" className="border-zinc-700 text-zinc-400 text-[9px] px-1.5">{tag}</Badge>
                                      ))}
                                      <div className="flex items-center gap-1 ml-auto">
                                        <div className="w-1 h-3 rounded-full bg-emerald-500" />
                                        <span className="text-[9px] text-emerald-400 font-medium">{Math.round(learning.importance * 100)}%</span>
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              )
                            })}
                        </div>
                        {sharedLearnings.length > 5 && (
                          <Button variant="ghost" size="sm" className="w-full mt-3 text-xs text-zinc-400 hover:text-zinc-200" onClick={() => setSharedLearningsExpanded(!sharedLearningsExpanded)}>
                            {sharedLearningsExpanded ? (<><ChevronUp className="h-3 w-3 mr-1" />Ver menos</>) : (<><ChevronDown className="h-3 w-3 mr-1" />Ver más ({sharedLearnings.length - 5} aprendizajes adicionales)</>)}
                          </Button>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                        <Input placeholder="Buscar en memorias..." className="bg-zinc-800 border-zinc-700 text-xs h-8 pl-8 pr-8" value={memorySearchQuery} onChange={(e) => { setMemorySearchQuery(e.target.value); handleMemorySearch(e.target.value) }} />
                        {memorySearching && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500 animate-spin" />}
                      </div>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setShowMemorySearch(!showMemorySearch); setMemorySearchQuery(''); setMemorySearchResults([]) }}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    {memorySearchResults.length > 0 && (
                      <ScrollArea className="max-h-48 mt-2">
                        <div className="space-y-1.5">
                          {memorySearchResults.map((r) => (
                            <div key={r.id} className="p-2 rounded-lg bg-zinc-800/50 border border-zinc-800">
                              <div className="flex items-center gap-1.5 mb-1">
                                <span className="text-xs">{r.agentEmoji}</span>
                                <span className="text-[10px] font-medium text-zinc-300">{r.agentName}</span>
                                <Badge className="text-[9px] px-1">{r.type}</Badge>
                              </div>
                              <p className="text-[10px] text-zinc-300 line-clamp-2">{r.content.slice(0, 150)}</p>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                    {memorySearchQuery.length >= 2 && !memorySearching && memorySearchResults.length === 0 && (
                      <p className="text-[10px] text-zinc-500 mt-2 text-center">Sin resultados para "{memorySearchQuery}"</p>
                    )}
                  </CardContent>
                </Card>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Select value={memoryAgentFilter} onValueChange={setMemoryAgentFilter}>
                    <SelectTrigger className="bg-zinc-900 border-zinc-800 flex-1 sm:w-48 text-sm"><Filter className="h-3.5 w-3.5 mr-1.5" /><SelectValue placeholder="Filtrar por división" /></SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      <SelectItem value="all">Todas las divisiones</SelectItem>
                      {divisions.map((div) => <SelectItem key={div} value={div}>{div}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Badge variant="outline" className="border-zinc-700 text-zinc-200 text-xs h-8 px-3 flex items-center"><FileText className="h-3 w-3 mr-1" />{filteredMemories.length} memorias</Badge>
                </div>

                {filteredMemories.length === 0 ? (
                  <Card className="bg-zinc-900 border-zinc-800"><CardContent className="py-12 text-center">
                    <FileText className="h-10 w-10 mx-auto mb-3 text-zinc-700" />
                    <p className="text-sm text-zinc-300">No hay memorias almacenadas</p>
                    <p className="text-xs text-zinc-200 mt-1">Las memorias se crean automáticamente al ejecutar oleadas</p>
                  </CardContent></Card>
                ) : (
                  <ScrollArea className="max-h-[600px]">
                    <div className="space-y-2">
                      {filteredMemories.map((memory, index) => {
                        const agent = project.agents.find((pa) => pa.agentId === memory.agentId)
                        return (
                          <motion.div key={memory.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.02 }}>
                            <Card className="bg-zinc-900 border-zinc-800">
                              <CardContent className="p-3">
                                <div className="flex items-start gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                      <span className="text-sm">{agent?.agent?.emoji || '🤖'}</span>
                                      <span className="text-xs font-medium text-zinc-300">{agent?.agent?.name || 'Desconocido'}</span>
                                      <Badge className={`text-[10px] px-1.5 ${MEMORY_TYPE_COLORS[memory.type] || ''}`}>{memory.type}</Badge>
                                    </div>
                                    <p className="text-xs text-zinc-200 leading-relaxed">{memory.content}</p>
                                    <div className="flex items-center gap-3 mt-2">
                                      {memory.tags && <div className="flex flex-wrap gap-1">{memory.tags.split(',').map((tag) => <Badge key={tag} variant="outline" className="border-zinc-700 text-zinc-300 text-[10px] px-1.5">{tag.trim()}</Badge>)}</div>}
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end gap-1 shrink-0">
                                    <div className="flex items-center gap-1">
                                      <div className={`w-1.5 h-6 rounded-full ${memory.importance > 0.7 ? 'bg-emerald-500' : memory.importance > 0.4 ? 'bg-amber-500' : 'bg-zinc-600'}`} />
                                      <span className="text-[10px] text-zinc-300">{Math.round(memory.importance * 100)}%</span>
                                    </div>
                                    <span className="text-[10px] text-zinc-200">{new Date(memory.createdAt).toLocaleDateString('es')}</span>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        )
                      })}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>

              {/* ===== SPECS TAB ===== */}
              <TabsContent value="specs" className="space-y-4">
                <Card className="bg-zinc-900 border-zinc-800">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium text-zinc-200 flex items-center gap-2">
                        <Plus className="h-4 w-4" />Nueva Especificación
                      </CardTitle>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant={specView === 'kanban' ? 'default' : 'ghost'} onClick={() => setSpecView('kanban')} className={`h-7 px-2 text-xs ${specView === 'kanban' ? 'bg-zinc-700 text-zinc-100' : ''}`}>
                          <Kanban className="h-3 w-3 mr-1" />Pipeline
                        </Button>
                        <Button size="sm" variant={specView === 'list' ? 'default' : 'ghost'} onClick={() => setSpecView('list')} className={`h-7 px-2 text-xs ${specView === 'list' ? 'bg-zinc-700 text-zinc-100' : ''}`}>
                          <ClipboardList className="h-3 w-3 mr-1" />Lista
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                      <div className="md:col-span-5">
                        <Input placeholder="Título de la especificación" value={specTitle} onChange={(e) => setSpecTitle(e.target.value)} className="bg-zinc-800 border-zinc-700 text-sm" />
                      </div>
                      <div className="md:col-span-5">
                        <Textarea placeholder="Descripción detallada (opcional)" value={specDescription} onChange={(e) => setSpecDescription(e.target.value)} rows={1} className="bg-zinc-800 border-zinc-700 text-sm resize-none" />
                      </div>
                      <div className="md:col-span-2 flex items-center gap-2">
                        <Select value={specPriority} onValueChange={setSpecPriority}>
                          <SelectTrigger className="bg-zinc-800 border-zinc-700 text-xs h-9 flex-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Baja</SelectItem>
                            <SelectItem value="medium">Media</SelectItem>
                            <SelectItem value="high">Alta</SelectItem>
                            <SelectItem value="critical">Crítica</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button size="sm" onClick={createSpec} disabled={specCreating || !specTitle.trim()} className="bg-cyan-600 hover:bg-cyan-700 text-white h-9 shrink-0">
                          {specCreating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {project.specs.length === 0 ? (
                  <Card className="bg-zinc-900 border-zinc-800"><CardContent className="py-12 text-center">
                    <ClipboardList className="h-10 w-10 mx-auto mb-3 text-zinc-700" />
                    <p className="text-sm text-zinc-300">No hay especificaciones creadas</p>
                    <p className="text-xs text-zinc-200 mt-1">Las specs guían el desarrollo basado en especificaciones (SDD)</p>
                  </CardContent></Card>
                ) : specView === 'kanban' ? (
                  <div className="overflow-x-auto pb-2">
                    <div className="flex gap-3 min-w-[900px]">
                      {SPEC_PHASES.map((phase) => {
                        const phaseCfg = SPEC_PHASE_CONFIG[phase]
                        const specsInPhase = project.specs.filter((s) => s.phase === phase && s.status === 'active')
                        return (
                          <div key={phase} className="flex-1 min-w-[160px]">
                            <div className="flex items-center gap-2 mb-3 px-1">
                              <div className={`w-2 h-2 rounded-full ${phaseCfg.bg.includes('zinc') ? 'bg-zinc-500' : phaseCfg.bg.includes('amber') ? 'bg-amber-500' : phaseCfg.bg.includes('cyan') ? 'bg-cyan-500' : phaseCfg.bg.includes('purple') ? 'bg-purple-500' : 'bg-emerald-500'}`} />
                              <span className={`text-xs font-medium ${phaseCfg.color}`}>{phaseCfg.label}</span>
                              <Badge variant="outline" className="border-zinc-700 text-zinc-300 text-[10px] px-1 py-0 ml-auto">{specsInPhase.length}</Badge>
                            </div>
                            <div className="space-y-2 max-h-[400px] overflow-y-auto">
                              {specsInPhase.length === 0 ? (
                                <div className="text-center py-4 text-[10px] text-zinc-200 border border-dashed border-zinc-800 rounded-lg">Sin specs</div>
                              ) : (
                                specsInPhase.map((spec) => {
                                  const prioCfg = SPEC_PRIORITY_CONFIG[spec.priority] || SPEC_PRIORITY_CONFIG.medium
                                  const isSelected = selectedSpec?.id === spec.id
                                  return (
                                    <motion.div
                                      key={spec.id}
                                      initial={{ opacity: 0, y: 5 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      className={`p-3 rounded-lg border cursor-pointer transition-all ${isSelected ? `${phaseCfg.bg} ring-1 ring-current/20` : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}`}
                                      onClick={() => setSelectedSpec(isSelected ? null : spec)}
                                    >
                                      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                                        <Badge variant="outline" className={`text-[9px] px-1 py-0 border ${prioCfg.color.split(' ')[1]} ${prioCfg.color.split(' ')[0]}`}>{prioCfg.label}</Badge>
                                        {spec._count && spec._count.waves > 0 && (
                                          <Badge variant="outline" className="border-zinc-700 text-zinc-300 text-[9px] px-1 py-0"><Waves className="h-2 w-2 mr-0.5" />{spec._count.waves}</Badge>
                                        )}
                                      </div>
                                      <p className="text-xs font-medium text-zinc-100 line-clamp-2">{spec.title}</p>
                                      <p className="text-[10px] text-zinc-200 mt-1 line-clamp-1">{spec.description.slice(0, 80)}</p>
                                      <p className="text-[9px] text-zinc-200 mt-2">{new Date(spec.createdAt).toLocaleDateString('es')}</p>
                                      <div className="flex items-center gap-1 mt-2 pt-2 border-t border-zinc-800">
                                        {SPEC_PHASES.indexOf(phase) > 0 && (
                                          <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-zinc-200 hover:text-zinc-100 hover:bg-zinc-800" onClick={(e) => { e.stopPropagation(); updateSpecPhase(spec.id, SPEC_PHASES[SPEC_PHASES.indexOf(phase) - 1]) }}>
                                            <ChevronLeft className="h-3 w-3" />
                                          </Button>
                                        )}
                                        {SPEC_PHASES.indexOf(phase) < SPEC_PHASES.length - 1 && (
                                          <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-zinc-200 hover:text-zinc-100 hover:bg-zinc-800" onClick={(e) => { e.stopPropagation(); updateSpecPhase(spec.id, SPEC_PHASES[SPEC_PHASES.indexOf(phase) + 1]) }}>
                                            <ChevronRight className="h-3 w-3" />
                                          </Button>
                                        )}
                                        <div className="flex-1" />
                                        <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-red-400 hover:text-red-300 hover:bg-red-400/10" onClick={(e) => { e.stopPropagation(); deleteSpec(spec.id) }}>
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </motion.div>
                                  )
                                })
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {project.specs.filter((s) => s.status === 'active').map((spec, idx) => {
                      const phaseCfg = SPEC_PHASE_CONFIG[spec.phase] || SPEC_PHASE_CONFIG.draft
                      const prioCfg = SPEC_PRIORITY_CONFIG[spec.priority] || SPEC_PRIORITY_CONFIG.medium
                      const isSelected = selectedSpec?.id === spec.id
                      return (
                        <motion.div
                          key={spec.id}
                          initial={{ opacity: 0, x: -5 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.02 }}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${isSelected ? `${phaseCfg.bg} ring-1 ring-current/20` : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}`}
                          onClick={() => setSelectedSpec(isSelected ? null : spec)}
                        >
                          <div className={`w-2 h-2 rounded-full shrink-0 ${phaseCfg.bg.includes('zinc') ? 'bg-zinc-500' : phaseCfg.bg.includes('amber') ? 'bg-amber-500' : phaseCfg.bg.includes('cyan') ? 'bg-cyan-500' : phaseCfg.bg.includes('purple') ? 'bg-purple-500' : 'bg-emerald-500'}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-zinc-100 truncate">{spec.title}</p>
                            <p className="text-[11px] text-zinc-200 truncate mt-0.5">{spec.description.slice(0, 120) || 'Sin descripción'}</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Badge variant="outline" className={`text-[9px] px-1 py-0 border ${phaseCfg.bg} ${phaseCfg.color}`}>{phaseCfg.label}</Badge>
                            <Badge variant="outline" className={`text-[9px] px-1 py-0 border ${prioCfg.color.split(' ')[1]} ${prioCfg.color.split(' ')[0]}`}>{prioCfg.label}</Badge>
                            {spec._count && spec._count.waves > 0 && (
                              <Badge variant="outline" className="border-zinc-700 text-zinc-300 text-[9px] px-1 py-0"><Waves className="h-2 w-2 mr-0.5" />{spec._count.waves}</Badge>
                            )}
                            <span className="text-[9px] text-zinc-200 ml-1">{new Date(spec.createdAt).toLocaleDateString('es')}</span>
                            <Select value={spec.phase} onValueChange={(v) => updateSpecPhase(spec.id, v)}>
                              <SelectTrigger className="h-6 w-auto bg-zinc-800 border-zinc-700 text-[9px] px-1" onClick={(e) => e.stopPropagation()}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {SPEC_PHASES.map((p) => (
                                  <SelectItem key={p} value={p}>{SPEC_PHASE_CONFIG[p].label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select value={spec.priority} onValueChange={(v) => updateSpecPriority(spec.id, v)}>
                              <SelectTrigger className="h-6 w-auto bg-zinc-800 border-zinc-700 text-[9px] px-1" onClick={(e) => e.stopPropagation()}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">Baja</SelectItem>
                                <SelectItem value="medium">Media</SelectItem>
                                <SelectItem value="high">Alta</SelectItem>
                                <SelectItem value="critical">Crítica</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-400/10 shrink-0" onClick={(e) => { e.stopPropagation(); deleteSpec(spec.id) }}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                )}

                {selectedSpec && (
                  <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-zinc-100">{selectedSpec.title}</CardTitle>
                        <Button size="sm" variant="ghost" onClick={() => setSelectedSpec(null)} className="h-6 w-6 p-0 text-zinc-200 hover:text-zinc-100">
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={`border ${SPEC_PHASE_CONFIG[selectedSpec.phase]?.bg} ${SPEC_PHASE_CONFIG[selectedSpec.phase]?.color}`}>{SPEC_PHASE_CONFIG[selectedSpec.phase]?.label}</Badge>
                        <Badge variant="outline" className={`border ${SPEC_PRIORITY_CONFIG[selectedSpec.priority]?.color.split(' ')[1]} ${SPEC_PRIORITY_CONFIG[selectedSpec.priority]?.color.split(' ')[0]}`}>{SPEC_PRIORITY_CONFIG[selectedSpec.priority]?.label}</Badge>
                        <span className="text-[10px] text-zinc-200">{new Date(selectedSpec.createdAt).toLocaleString('es')}</span>
                      </div>
                      {selectedSpec.description && (
                        <p className="text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap">{selectedSpec.description}</p>
                      )}
                      {project.waves.filter((w) => w.specId === selectedSpec.id).length > 0 && (
                        <div className="space-y-1">
                          <p className="text-[10px] font-medium text-zinc-300">Oleadas Vinculadas:</p>
                          <ScrollArea className="max-h-32">
                            {project.waves.filter((w) => w.specId === selectedSpec.id).map((w) => (
                              <div key={w.id} className="flex items-center gap-2 p-1.5 rounded bg-zinc-800/50 border border-zinc-800 text-[11px]">
                                <div className={`w-1.5 h-1.5 rounded-full ${WAVE_DOT_COLOR[w.type] || 'bg-zinc-500'}`} />
                                <span className="text-zinc-200">#{w.number}</span>
                                <Badge variant="outline" className={`border ${WAVE_COLOR_MAP[w.type]?.split(' ')[2] || 'border-zinc-500'} ${(WAVE_COLOR_MAP[w.type]?.split(' ')[0]) || 'text-zinc-300'} text-[9px] px-1 py-0`}>{w.type}</Badge>
                                <span className="text-zinc-200 truncate">{w.prompt.slice(0, 60)}</span>
                              </div>
                            ))}
                          </ScrollArea>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* ===== PROPOSALS TAB ===== */}
              <TabsContent value="proposals" className="space-y-4">
                {project.proposals.length === 0 ? (
                  <Card className="bg-zinc-900 border-zinc-800"><CardContent className="py-12 text-center">
                    <Target className="h-10 w-10 mx-auto mb-3 text-zinc-700" />
                    <p className="text-sm text-zinc-300">No hay propuestas generadas</p>
                    <p className="text-xs text-zinc-200 mt-1">Las propuestas se generan automáticamente en oleadas de Crítica</p>
                    <Button variant="ghost" size="sm" className="mt-3 text-red-400" onClick={() => { setActiveTab('waves'); setWaveType('critique') }}>
                      Ejecutar Crítica →
                    </Button>
                  </CardContent></Card>
                ) : (
                  <div className="space-y-3">
                    {project.proposals.map((proposal) => {
                      const statusCfg = PROPOSAL_STATUS_MAP[proposal.status] || PROPOSAL_STATUS_MAP.proposed
                      return (
                        <Card key={proposal.id} className={`bg-zinc-900 border-l-4 ${statusCfg.color.split(' ')[0]}`}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                  <Badge variant="outline" className={statusCfg.color}>{statusCfg.label}</Badge>
                                  <Badge variant="outline" className="border-zinc-700 text-zinc-200 text-[10px]">{proposal.type}</Badge>
                                  <Badge variant="outline" className={`border-zinc-700 text-[10px] ${proposal.priority === 'high' ? 'text-red-400' : proposal.priority === 'urgent' ? 'text-red-500' : proposal.priority === 'medium' ? 'text-amber-400' : 'text-zinc-200'}`}>{proposal.priority}</Badge>
                                </div>
                                <h3 className="text-sm font-medium">{proposal.title}</h3>
                                <p className="text-xs text-zinc-200 mt-1 leading-relaxed">{proposal.description}</p>
                                <p className="text-[10px] text-zinc-200 mt-2">Creada: {new Date(proposal.createdAt).toLocaleString('es')}</p>
                              </div>
                              {proposal.status === 'proposed' && (
                                <div className="flex gap-1.5 shrink-0">
                                  <Button size="sm" variant="ghost" onClick={() => updateProposalStatus(proposal.id, 'approved')} className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10 h-8 w-8 p-0" title="Aprobar"><ThumbsUp className="h-4 w-4" /></Button>
                                  <Button size="sm" variant="ghost" onClick={() => updateProposalStatus(proposal.id, 'rejected')} className="text-red-400 hover:text-red-300 hover:bg-red-400/10 h-8 w-8 p-0" title="Rechazar"><ThumbsDown className="h-4 w-4" /></Button>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-zinc-800 bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between text-xs text-zinc-200">
          <span>🧬 NEXUS Sim — Simulación Multi-Agente Colaborativa</span>
          <div className="flex items-center gap-3">
            <a href="/docs" className="hover:text-emerald-400 transition-colors flex items-center gap-1">
              <BookOpen className="h-3 w-3" />API Docs
            </a>
            <span>{project.agents.length} agentes · {project.waves.length} oleadas</span>
          </div>
        </div>
      </footer>

      {/* Wave Detail Dialog */}
      <WaveDetailDialog wave={dialogWave} onClose={() => setDialogWave(null)} />
    </div>
  )
}
