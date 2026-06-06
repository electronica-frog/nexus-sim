'use client'

import React, { Suspense, useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Card, CardContent,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Activity, Users, Waves, BarChart3, FileText, ClipboardList, Target,
  RefreshCw, Database, Loader2, BookOpen,
  Map, Brain, Gavel, FolderTree, Plus, ChevronDown, MessageSquarePlus,
} from 'lucide-react'

// Extracted modules
import { useNexusData } from '@/components/nexus/use-nexus-data'

// Dynamic imports for extracted heavy tabs
const WaveDetailDialog = dynamic(() => import('@/components/nexus/wave-detail-dialog').then(m => ({ default: m.WaveDetailDialog })), { ssr: false })
const DashboardTab = dynamic(() => import('@/components/nexus/dashboard-tab').then(m => ({ default: m.DashboardTab })), { loading: () => <div className="h-96 bg-zinc-900 rounded-lg animate-pulse" />, ssr: false })
const RoadmapTab = dynamic(() => import('@/components/nexus/roadmap-tab').then(m => ({ default: m.RoadmapTab })), { loading: () => <div className="h-64 bg-zinc-900 rounded-lg animate-pulse" />, ssr: false })
const AgentsTab = dynamic(() => import('@/components/nexus/agents-tab').then(m => ({ default: m.AgentsTab })), { loading: () => <div className="h-96 bg-zinc-900 rounded-lg animate-pulse" />, ssr: false })
const WavesTab = dynamic(() => import('@/components/nexus/waves-tab').then(m => ({ default: m.WavesTab })), { loading: () => <div className="h-96 bg-zinc-900 rounded-lg animate-pulse" />, ssr: false })
const MemoryTab = dynamic(() => import('@/components/nexus/memory-tab').then(m => ({ default: m.MemoryTab })), { loading: () => <div className="h-96 bg-zinc-900 rounded-lg animate-pulse" />, ssr: false })
const SpecsTab = dynamic(() => import('@/components/nexus/specs-tab').then(m => ({ default: m.SpecsTab })), { loading: () => <div className="h-96 bg-zinc-900 rounded-lg animate-pulse" />, ssr: false })
const ProposalsTab = dynamic(() => import('@/components/nexus/proposals-tab').then(m => ({ default: m.ProposalsTab })), { loading: () => <div className="h-96 bg-zinc-900 rounded-lg animate-pulse" />, ssr: false })
const Mem0Tab = dynamic(() => import('@/components/nexus/mem0-tab').then(m => ({ default: m.Mem0Tab })), { loading: () => <div className="h-64 bg-zinc-900 rounded-lg animate-pulse" />, ssr: false })
const CrewAITab = dynamic(() => import('@/components/nexus/crew-ai-tab').then(m => ({ default: m.CrewAITab })), { loading: () => <div className="h-96 bg-zinc-900 rounded-lg animate-pulse" />, ssr: false })
const JudgesTab = dynamic(() => import('@/components/nexus/judges-tab').then(m => ({ default: m.JudgesTab })), { loading: () => <div className="h-96 bg-zinc-900 rounded-lg animate-pulse" />, ssr: false })
const ProjectsTab = dynamic(() => import('@/components/nexus/projects-tab').then(m => ({ default: m.ProjectsTab })), { loading: () => <div className="h-96 bg-zinc-900 rounded-lg animate-pulse" />, ssr: false })
const PromptsTab = dynamic(() => import('@/components/nexus/prompts-tab').then(m => ({ default: m.PromptsTab })), { loading: () => <div className="h-96 bg-zinc-900 rounded-lg animate-pulse" />, ssr: false })

// ===== Main Component =====
export default function NexusContent() {
  const {
    projects, project, loading, seeding, creatingProject, activeTab, setActiveTab,
    wavePrompt, setWavePrompt, waveType, setWaveType,
    selectedAgentIds, runningWave, agentFilter, setAgentFilter,
    agentSearch, setAgentSearch, selectedAgent, setSelectedAgent,
    memoryAgentFilter, setMemoryAgentFilter,
    selectedWave, setSelectedWave, dialogWave, setDialogWave,
    sharedLearnings, sharedLearningsExpanded, setSharedLearningsExpanded,
    memorySearchQuery, setMemorySearchQuery, memorySearchResults,
    memorySearching, memorySearchType, showMemorySearch, setShowMemorySearch,
    chromaIndexing, chromaStatus, indexChroma,
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
    liveConnected, connectionCount,
    divisions, filteredAgents, filteredMemories,
    avgConfidence, moodCounts, topTrustedAgents, avgTrust,
    handleSeed, toggleAgent, selectProject, createNewProject, fetchProjects,
    runWaveStream, runPipelineStream,
    updateProposalStatus, createSpec, updateSpecPhase,
    updateSpecPriority, deleteSpec, createSpecFromWave,
    exportData, fetchBenchMetrics, deleteSkill, handleMemorySearch,
    toggleBenchSort, getFilteredSortedMetrics,
  } = useNexusData()

  // ===== How It Works Banner =====
  const [showBanner, setShowBanner] = useState(false)
  const [showProjectMenu, setShowProjectMenu] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  useEffect(() => {
    const dismissed = localStorage.getItem('nexus-how-banner-dismissed')
    if (!dismissed) setShowBanner(true)
  }, [])
  const dismissBanner = () => {
    setShowBanner(false)
    localStorage.setItem('nexus-how-banner-dismissed', '1')
  }

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
            {/* Project Selector */}
            {projects.length > 1 && (
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowProjectMenu(!showProjectMenu)}
                  className="text-zinc-200 hover:text-zinc-100 gap-1.5 border border-zinc-700/50"
                >
                  <FolderTree className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="hidden sm:inline max-w-[120px] truncate">{project?.name || 'Proyecto'}</span>
                  <ChevronDown className="h-3 w-3 text-zinc-400" />
                </Button>
                {showProjectMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowProjectMenu(false)} />
                    <div className="absolute right-0 top-full mt-1 z-50 w-64 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl overflow-hidden">
                      <div className="p-2 space-y-1 max-h-60 overflow-y-auto">
                        <p className="text-[10px] text-zinc-500 font-medium px-2 py-1">PROYECTOS ({projects.length})</p>
                        {projects.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => { selectProject(p.id); setShowProjectMenu(false) }}
                            className={`w-full text-left px-3 py-2 rounded-md text-xs transition-colors flex items-center justify-between ${
                              p.id === project?.id
                                ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                                : 'text-zinc-300 hover:bg-zinc-800 border border-transparent'
                            }`}
                          >
                            <span className="truncate">{p.name}</span>
                            {p.id === project?.id && <span className="text-emerald-400 text-[9px]">●</span>}
                          </button>
                        ))}
                      </div>
                      <Separator className="bg-zinc-800" />
                      <div className="p-2">
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            placeholder="Nombre del proyecto..."
                            value={newProjectName}
                            onChange={(e) => setNewProjectName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && newProjectName.trim()) {
                                createNewProject(newProjectName.trim())
                                setNewProjectName('')
                                setShowProjectMenu(false)
                              }
                            }}
                            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1.5 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (newProjectName.trim()) {
                                createNewProject(newProjectName.trim())
                                setNewProjectName('')
                                setShowProjectMenu(false)
                              }
                            }}
                            disabled={!newProjectName.trim() || creatingProject}
                            className="h-7 w-7 p-0 text-emerald-400 hover:text-emerald-300"
                          >
                            {creatingProject ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
            <Badge variant="outline" className="border-zinc-700 text-zinc-300 text-xs">{project?.agents.length || 0} agentes</Badge>
            <Badge variant="outline" className="border-emerald-700 text-emerald-300 text-xs">
              <Activity className="h-3 w-3 mr-1" />{project?.status || 'active'}
            </Badge>
            <Button variant="ghost" size="sm" onClick={handleSeed} disabled={seeding} className="text-zinc-200 hover:text-zinc-100">
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${seeding ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Re-sembrar</span>
            </Button>
          </div>
        </div>
      </header>

      {/* CÓMO FUNCIONA ESTO Banner */}
      {showBanner && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.3 }}
        >
          <div className="max-w-7xl mx-auto px-4 md:px-6 pt-4">
            <Card className="bg-gradient-to-r from-violet-950/80 via-zinc-900 to-emerald-950/60 border border-zinc-700/60 overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">💡</span>
                      <h2 className="text-lg font-bold text-zinc-50">CÓMO FUNCIONA ESTO</h2>
                      <Badge className="bg-amber-600/90 text-amber-50 text-[10px] px-1.5 py-0">IMPORTANTE</Badge>
                    </div>
                    <div className="space-y-2 text-sm text-zinc-200 leading-relaxed">
                      <p>
                        <span className="font-semibold text-emerald-400">Bienvenido a NEXUS Sim.</span> Esta es tu consola de control completa. Podés ejecutar oleadas de simulación directamente desde la tab <span className="font-semibold text-violet-400">Oleadas</span>, usar el <span className="font-semibold text-violet-400">Pipeline Completo (5 pasos)</span>, evaluar resultados con <span className="font-semibold text-violet-400">LLM Judges</span> y orquestar crews con <span className="font-semibold text-violet-400">CrewAI</span>.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
                        <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-sm">🚀</span>
                            <span className="font-medium text-zinc-100 text-xs">OLEADAS</span>
                          </div>
                          <p className="text-xs text-zinc-300">Ejecutá brainstorm, críticas, síntesis y más. Las oleadas están enfocadas en mejorar NEXUS.</p>
                        </div>
                        <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-sm">📊</span>
                            <span className="font-medium text-zinc-100 text-xs">ANÁLISIS</span>
                          </div>
                          <p className="text-xs text-zinc-300">Revisá memorias, skills, trust scores y evaluaciones de los jueces LLM.</p>
                        </div>
                        <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-sm">🤝</span>
                            <span className="font-medium text-zinc-100 text-xs">ORQUESTACIÓN</span>
                          </div>
                          <p className="text-xs text-zinc-300">CrewAI crews, pipelines automáticos, specs y propuestas — todo desde acá.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={dismissBanner}
                    className="text-zinc-400 hover:text-zinc-100 shrink-0 mt-1"
                  >
                    ✕ Cerrar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-6 py-4 md:py-6">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            <Tabs value={activeTab} onValueChange={(v) => {
              setActiveTab(v)
            }}>
              <TabsList className="bg-zinc-900 border border-zinc-800 mb-6 overflow-x-auto flex-nowrap">
                <TabsTrigger value="projects" className="data-[state=active]:bg-zinc-800 min-w-fit shrink-0"><FolderTree className="h-3.5 w-3.5 mr-1.5" />Proyectos</TabsTrigger>
                <TabsTrigger value="roadmap" className="data-[state=active]:bg-zinc-800 min-w-fit shrink-0"><Map className="h-3.5 w-3.5 mr-1.5" />Roadmap</TabsTrigger>
                <TabsTrigger value="dashboard" className="data-[state=active]:bg-zinc-800 min-w-fit shrink-0"><BarChart3 className="h-3.5 w-3.5 mr-1.5" />Dashboard</TabsTrigger>
                <TabsTrigger value="agents" className="data-[state=active]:bg-zinc-800 min-w-fit shrink-0"><Users className="h-3.5 w-3.5 mr-1.5" />Agentes</TabsTrigger>
                <TabsTrigger value="waves" className="data-[state=active]:bg-zinc-800 min-w-fit shrink-0"><Waves className="h-3.5 w-3.5 mr-1.5" />Oleadas</TabsTrigger>
                <TabsTrigger value="memory" className="data-[state=active]:bg-zinc-800 min-w-fit shrink-0"><FileText className="h-3.5 w-3.5 mr-1.5" />Memoria</TabsTrigger>
                <TabsTrigger value="mem0" className="data-[state=active]:bg-zinc-800 min-w-fit shrink-0"><Brain className="h-3.5 w-3.5 mr-1.5" />Mem0</TabsTrigger>
                <TabsTrigger value="specs" className="data-[state=active]:bg-zinc-800 min-w-fit shrink-0"><ClipboardList className="h-3.5 w-3.5 mr-1.5" />Specs</TabsTrigger>
                <TabsTrigger value="proposals" className="data-[state=active]:bg-zinc-800 min-w-fit shrink-0"><Target className="h-3.5 w-3.5 mr-1.5" />Propuestas</TabsTrigger>
                <TabsTrigger value="crew" className="data-[state=active]:bg-zinc-800 min-w-fit shrink-0"><Users className="h-3.5 w-3.5 mr-1.5" />CrewAI</TabsTrigger>
                <TabsTrigger value="judges" className="data-[state=active]:bg-zinc-800 min-w-fit shrink-0"><Gavel className="h-3.5 w-3.5 mr-1.5" />Judges</TabsTrigger>
                <TabsTrigger value="prompts" className="data-[state=active]:bg-zinc-800 min-w-fit shrink-0"><MessageSquarePlus className="h-3.5 w-3.5 mr-1.5" />Prompts</TabsTrigger>
              </TabsList>

              {/* ===== PROJECTS TAB ===== */}
              <TabsContent value="projects" className="space-y-6">
                <ProjectsTab
                  projects={projects}
                  currentProjectId={project?.id}
                  selectProject={selectProject}
                  createNewProject={createNewProject}
                  setActiveTab={setActiveTab}
                  fetchProjects={fetchProjects}
                />
              </TabsContent>

              {/* ===== ROADMAP TAB ===== */}
              <TabsContent value="roadmap" className="space-y-6">
                <RoadmapTab />
              </TabsContent>

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
                  liveConnected={liveConnected}
                  connectionCount={connectionCount}
                />
              </TabsContent>

              {/* ===== AGENTS TAB ===== */}
              <TabsContent value="agents" className="space-y-4">
                <AgentsTab
                  project={project}
                  filteredAgents={filteredAgents}
                  agentSearch={agentSearch}
                  setAgentSearch={setAgentSearch}
                  agentFilter={agentFilter}
                  setAgentFilter={setAgentFilter}
                  divisions={divisions}
                  agentSkills={agentSkills}
                  selectedAgent={selectedAgent}
                  setSelectedAgent={setSelectedAgent}
                  deleteSkill={deleteSkill}
                />
              </TabsContent>

              {/* ===== WAVE SIMULATION TAB ===== */}
              <TabsContent value="waves" className="space-y-6">
                <WavesTab
                  project={project}
                  wavePrompt={wavePrompt}
                  setWavePrompt={setWavePrompt}
                  waveType={waveType}
                  setWaveType={setWaveType}
                  selectedAgentIds={selectedAgentIds}
                  runningWave={runningWave}
                  runningPipeline={runningPipeline}
                  pipelineStep={pipelineStep}
                  pipelineComplete={pipelineComplete}
                  liveAgents={liveAgents}
                  liveComplete={liveComplete}
                  liveSynthesis={liveSynthesis}
                  selectedWave={selectedWave}
                  setSelectedWave={setSelectedWave}
                  dialogWave={dialogWave}
                  setDialogWave={setDialogWave}
                  specCreating={specCreating}
                  waveSpecLink={waveSpecLink}
                  setWaveSpecLink={setWaveSpecLink}
                  toggleAgent={toggleAgent}
                  runWaveStream={runWaveStream}
                  runPipelineStream={runPipelineStream}
                  createSpecFromWave={createSpecFromWave}
                />
              </TabsContent>

              {/* ===== MEMORY TAB ===== */}
              <TabsContent value="memory" className="space-y-4">
                <MemoryTab
                  project={project}
                  sharedLearnings={sharedLearnings}
                  sharedLearningsExpanded={sharedLearningsExpanded}
                  setSharedLearningsExpanded={setSharedLearningsExpanded}
                  memorySearchQuery={memorySearchQuery}
                  setMemorySearchQuery={setMemorySearchQuery}
                  memorySearchResults={memorySearchResults}
                  memorySearching={memorySearching}
                  memorySearchType={memorySearchType}
                  showMemorySearch={showMemorySearch}
                  setShowMemorySearch={setShowMemorySearch}
                  memoryAgentFilter={memoryAgentFilter}
                  setMemoryAgentFilter={setMemoryAgentFilter}
                  divisions={divisions}
                  filteredMemories={filteredMemories}
                  handleMemorySearch={handleMemorySearch}
                  chromaIndexing={chromaIndexing}
                  chromaStatus={chromaStatus}
                  indexChroma={indexChroma}
                />
              </TabsContent>

              {/* ===== MEM0 TAB ===== */}
              <TabsContent value="mem0" className="space-y-4">
                <Mem0Tab projectId={project.id} />
              </TabsContent>

              {/* ===== SPECS TAB ===== */}
              <TabsContent value="specs" className="space-y-4">
                <SpecsTab
                  project={project}
                  specTitle={specTitle}
                  setSpecTitle={setSpecTitle}
                  specDescription={specDescription}
                  setSpecDescription={setSpecDescription}
                  specPriority={specPriority}
                  setSpecPriority={setSpecPriority}
                  specCreating={specCreating}
                  specView={specView}
                  setSpecView={setSpecView}
                  selectedSpec={selectedSpec}
                  setSelectedSpec={setSelectedSpec}
                  createSpec={createSpec}
                  updateSpecPhase={updateSpecPhase}
                  updateSpecPriority={updateSpecPriority}
                  deleteSpec={deleteSpec}
                />
              </TabsContent>

              {/* ===== CREW AI TAB ===== */}
              <TabsContent value="crew" className="space-y-4">
                <CrewAITab projectId={project.id} project={project} />
              </TabsContent>

              {/* ===== JUDGES TAB ===== */}
              <TabsContent value="judges" className="space-y-4">
                <JudgesTab projectId={project.id} />
              </TabsContent>

              {/* ===== PROMPTS TAB ===== */}
              <TabsContent value="prompts" className="space-y-4">
                <PromptsTab projectId={project.id} />
              </TabsContent>

              {/* ===== PROPOSALS TAB ===== */}
              <TabsContent value="proposals" className="space-y-4">
                <ProposalsTab
                  project={project}
                  updateProposalStatus={updateProposalStatus}
                  setActiveTab={setActiveTab}
                  setWaveType={setWaveType}
                />
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
            <span>{project?.agents.length || 0} agentes · {project?.waves.length || 0} oleadas</span>
          </div>
        </div>
      </footer>

      {/* Wave Detail Dialog */}
      <WaveDetailDialog wave={dialogWave} onClose={() => setDialogWave(null)} />
    </div>
  )
}
