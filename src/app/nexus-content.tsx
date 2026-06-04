'use client'

import React, { Suspense } from 'react'
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
  Map,
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
                <TabsTrigger value="roadmap" className="data-[state=active]:bg-zinc-800"><Map className="h-3.5 w-3.5 mr-1.5" />Roadmap</TabsTrigger>
                <TabsTrigger value="dashboard" className="data-[state=active]:bg-zinc-800"><BarChart3 className="h-3.5 w-3.5 mr-1.5" />Dashboard</TabsTrigger>
                <TabsTrigger value="agents" className="data-[state=active]:bg-zinc-800"><Users className="h-3.5 w-3.5 mr-1.5" />Agentes</TabsTrigger>
                <TabsTrigger value="waves" className="data-[state=active]:bg-zinc-800"><Waves className="h-3.5 w-3.5 mr-1.5" />Oleadas</TabsTrigger>
                <TabsTrigger value="memory" className="data-[state=active]:bg-zinc-800"><FileText className="h-3.5 w-3.5 mr-1.5" />Memoria</TabsTrigger>
                <TabsTrigger value="specs" className="data-[state=active]:bg-zinc-800"><ClipboardList className="h-3.5 w-3.5 mr-1.5" />Specs</TabsTrigger>
                <TabsTrigger value="proposals" className="data-[state=active]:bg-zinc-800"><Target className="h-3.5 w-3.5 mr-1.5" />Propuestas</TabsTrigger>
              </TabsList>

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
                  showMemorySearch={showMemorySearch}
                  setShowMemorySearch={setShowMemorySearch}
                  memoryAgentFilter={memoryAgentFilter}
                  setMemoryAgentFilter={setMemoryAgentFilter}
                  divisions={divisions}
                  filteredMemories={filteredMemories}
                  handleMemorySearch={handleMemorySearch}
                />
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
            <span>{project.agents.length} agentes · {project.waves.length} oleadas</span>
          </div>
        </div>
      </footer>

      {/* Wave Detail Dialog */}
      <WaveDetailDialog wave={dialogWave} onClose={() => setDialogWave(null)} />
    </div>
  )
}
