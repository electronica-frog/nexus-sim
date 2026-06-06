'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { toast } from 'sonner'
import type {
  Project, Wave, LiveAgentState, BenchAgentMetric, BenchAggregates,
  AgentSkill, Agent, DashboardData,
} from './types'
import { SPEC_PHASE_CONFIG, SPEC_PRIORITY_CONFIG } from './constants'
import { useNexusLive } from '@/hooks/use-nexus-live'

export function useNexusData() {
  const [projects, setProjects] = useState<Project[]>([])
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [activeTab, setActiveTab] = useState('roadmap')
  const [creatingProject, setCreatingProject] = useState(false)

  // Wave simulation state
  const [wavePrompt, setWavePrompt] = useState('')
  const [waveType, setWaveType] = useState('brainstorm')
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([])
  const [runningWave, setRunningWave] = useState(false)
  const [agentFilter, setAgentFilter] = useState('all')
  const [agentSearch, setAgentSearch] = useState('')
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [memoryAgentFilter, setMemoryAgentFilter] = useState('all')
  const [selectedWave, setSelectedWave] = useState<Wave | null>(null)
  const [dialogWave, setDialogWave] = useState<Wave | null>(null)
  const [sharedLearnings, setSharedLearnings] = useState<Array<{
    id: string; agentName: string; agentEmoji: string; agentDivision: string;
    waveType: string; content: string; tags: string[]; importance: number; type: string; createdAt: string
  }>>([])
  const [sharedLearningsExpanded, setSharedLearningsExpanded] = useState(false)
  const [memorySearchQuery, setMemorySearchQuery] = useState('')
  const [memorySearchResults, setMemorySearchResults] = useState<Array<{
    id: string; agentName: string; agentEmoji: string; agentDivision: string;
    content: string; tags: string[]; importance: number; type: string; createdAt: string;
    score?: number; matchedTerms?: string[];
  }>>([])
  const [memorySearching, setMemorySearching] = useState(false)
  const [memorySearchType, setMemorySearchType] = useState<string>('')
  const [showMemorySearch, setShowMemorySearch] = useState(false)
  const [chromaIndexing, setChromaIndexing] = useState(false)
  const [chromaStatus, setChromaStatus] = useState<{ memories: number; skills: number } | null>(null)

  // SSE Live state
  const [liveAgents, setLiveAgents] = useState<LiveAgentState[]>([])
  const [liveComplete, setLiveComplete] = useState(false)
  const [liveSynthesis, setLiveSynthesis] = useState<string | null>(null)
  const [liveWaveType, setLiveWaveType] = useState<string | null>(null)

  // Pipeline state
  const [runningPipeline, setRunningPipeline] = useState(false)
  const [pipelineStep, setPipelineStep] = useState(0)
  const [pipelineAgents, setPipelineAgents] = useState<LiveAgentState[]>([])
  const [pipelineComplete, setPipelineComplete] = useState(false)
  const [pipelineSummary, setPipelineSummary] = useState<string | null>(null)

  // Benchmarking state
  const [benchMetrics, setBenchMetrics] = useState<BenchAgentMetric[] | null>(null)
  const [benchAggregates, setBenchAggregates] = useState<BenchAggregates | null>(null)
  const [benchLoading, setBenchLoading] = useState(false)
  const [benchDivisionFilter, setBenchDivisionFilter] = useState('all')
  const [benchSortField, setBenchSortField] = useState<keyof BenchAgentMetric>('trustScore')
  const [benchSortDir, setBenchSortDir] = useState<'asc' | 'desc'>('desc')
  const [benchSelectedAgent, setBenchSelectedAgent] = useState<BenchAgentMetric | null>(null)

  // Specs state
  const [specTitle, setSpecTitle] = useState('')
  const [specDescription, setSpecDescription] = useState('')
  const [specPriority, setSpecPriority] = useState('medium')
  const [specCreating, setSpecCreating] = useState(false)
  const [specView, setSpecView] = useState<'list' | 'kanban'>('kanban')
  const [selectedSpec, setSelectedSpec] = useState<{ id: string; title: string; description: string; phase: string; priority: string; status: string; createdAt: string; updatedAt: string; _count?: { waves: number } } | null>(null)
  const [waveSpecLink, setWaveSpecLink] = useState<string | null>(null)

  // Skills state (Auto-Mejora)
  const [agentSkills, setAgentSkills] = useState<AgentSkill[]>([])

  // Consolidated dashboard state
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)

  // Real-time live connection
  const live = useNexusLive(project?.id)

  // Derived views from dashboard for backward compatibility in JSX
  const systemHealth = dashboard
  const activityLogs = dashboard?.activityLogs ?? []
  const waveStats = dashboard?.waveStats ?? []

  const abortRef = useRef<AbortController | null>(null)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dashboardRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Cleanup pending search timeout on unmount to prevent state updates on dead components
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
        searchTimeoutRef.current = null
      }
    }
  }, [])

  const fetchDashboard = useCallback(async (projId: string) => {
    try {
      const res = await fetch(`/api/nexus/dashboard?projectId=${projId}`)
      const data = await res.json()
      if (data.totalAgents !== undefined) {
        setDashboard(data)
      }
    } catch (err) {
      console.error('Error fetching dashboard:', err)
    }
  }, [])

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/nexus')
      const data = await res.json()
      if (data.projects) {
        setProjects(data.projects)
        return data.projects
      }
    } catch (err) {
      console.error('Error fetching projects:', err)
    }
    return []
  }, [])

  const fetchProject = useCallback(async (projectId?: string) => {
    try {
      setLoading(true)
      const list = await fetchProjects()
      const targetId = projectId || (list.length > 0 ? list[0].id : null)
      if (!targetId) {
        setLoading(false)
        return null
      }
      const projRes = await fetch(`/api/nexus?projectId=${targetId}`)
      const projData = await projRes.json()
      if (projData.project) {
        setProject(projData.project)
        return projData.project
      }
    } catch (err) {
      console.error('Error fetching project:', err)
    } finally {
      setLoading(false)
    }
    return null
  }, [fetchProjects])

  const selectProject = useCallback(async (projectId: string) => {
    // Reset all dependent state
    setDashboard(null)
    setBenchMetrics(null)
    setBenchAggregates(null)
    setAgentSkills([])
    setSharedLearnings([])
    setSelectedWave(null)
    setSelectedSpec(null)
    setSelectedAgent(null)
    setLiveAgents([])
    setLiveComplete(false)
    setLiveSynthesis(null)
    setSelectedAgentIds([])
    setMemorySearchResults([])
    // Fetch the selected project
    try {
      setLoading(true)
      const projRes = await fetch(`/api/nexus?projectId=${projectId}`)
      const projData = await projRes.json()
      if (projData.project) {
        setProject(projData.project)
      }
    } catch (err) {
      console.error('Error switching project:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const createNewProject = useCallback(async (name: string, description?: string) => {
    setCreatingProject(true)
    try {
      const res = await fetch('/api/nexus/project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description: description || `Proyecto ${name}` }),
      })
      const data = await res.json()
      if (data.project) {
        toast.success(`Proyecto "${name}" creado con ${data.agentCount || 0} agentes`)
        await fetchProjects()
        await selectProject(data.project.id)
        return data.project
      }
    } catch {
      toast.error('Error al crear proyecto')
    } finally {
      setCreatingProject(false)
    }
    return null
  }, [fetchProjects, selectProject])

  // Separate: fetch dashboard AFTER project is loaded (sequential)
  useEffect(() => {
    if (project && !dashboard) {
      const timer = setTimeout(() => fetchDashboard(project.id), 500)
      return () => clearTimeout(timer)
    }
  }, [project, dashboard, fetchDashboard])

  const fetchSharedLearnings = useCallback(async () => {
    if (!project) return
    try {
      const res = await fetch(`/api/nexus/shared-learnings?projectId=${project.id}&minImportance=0.7`)
      const data = await res.json()
      if (data.learnings) {
        setSharedLearnings(data.learnings)
      }
    } catch (err) {
      console.error('Error fetching shared learnings:', err)
    }
  }, [project])

  const handleMemorySearch = useCallback((query: string) => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    if (!project || query.length < 2) {
      setMemorySearchResults([])
      return
    }
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        setMemorySearching(true)
        const res = await fetch(`/api/nexus/memory-search?projectId=${project.id}&q=${encodeURIComponent(query)}&limit=20`)
        const data = await res.json()
        if (data.results) {
          setMemorySearchResults(data.results)
          setMemorySearchType(data.searchType || 'unknown')
        }
      } catch (err) {
        console.error('Error searching memories:', err)
      } finally {
        setMemorySearching(false)
      }
    }, 400)
  }, [project])

  const fetchBenchMetrics = useCallback(async () => {
    if (!project) return
    try {
      setBenchLoading(true)
      const res = await fetch(`/api/nexus/metrics?projectId=${project.id}`)
      const data = await res.json()
      if (data.metrics) {
        setBenchMetrics(data.metrics)
        setBenchAggregates(data.aggregates)
      }
    } catch (err) {
      console.error('Error fetching metrics:', err)
    } finally {
      setBenchLoading(false)
    }
  }, [project])

  const fetchSkills = useCallback(async () => {
    if (!project) return
    try {
      const res = await fetch(`/api/nexus/skills?projectId=${project.id}`)
      const data = await res.json()
      if (data.skills) {
        setAgentSkills(data.skills)
      }
    } catch (err) {
      console.error('Error fetching skills:', err)
    }
  }, [project])

  // ChromaDB indexing
  const fetchChromaStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/nexus/chroma-index')
      const data = await res.json()
      if (data.collections) {
        setChromaStatus({ memories: data.collections['nexus-memories'] || 0, skills: data.collections['nexus-skills'] || 0 })
      }
    } catch (error) {
      console.error('[fetchChromaStatus]', error)
      toast.error('Error al consultar estado de ChromaDB')
    }
  }, [])

  const indexChroma = useCallback(async () => {
    if (!project) return
    setChromaIndexing(true)
    try {
      const res = await fetch(`/api/nexus/chroma-index?projectId=${project.id}&reset=true`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        toast.success(`ChromaDB: ${data.memoriesIndexed} memorias + ${data.skillsIndexed} skills indexados`)
        await fetchChromaStatus()
      } else {
        toast.error(`Error indexing ChromaDB: ${data.error}`)
      }
    } catch {
      toast.error('Error de conexión con ChromaDB')
    } finally {
      setChromaIndexing(false)
    }
  }, [project, fetchChromaStatus])

  const deleteSkill = async (skillId: string) => {
    try {
      const res = await fetch(`/api/nexus/skill?id=${skillId}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        toast.success('Habilidad eliminada')
        await fetchSkills()
      }
    } catch {
      toast.error('Error al eliminar habilidad')
    }
  }

  // Staggered lazy loading: after dashboard loads, fetch heavy data sequentially with delays
  useEffect(() => {
    if (!project || !dashboard) return
    const timer = setTimeout(async () => {
      try { await fetchBenchMetrics() } catch (error) {
        console.error('[fetchBenchMetrics-staggered]', error)
        toast.error('Error al cargar métricas de benchmark')
      }
    }, 2000)
    return () => clearTimeout(timer)
  }, [project, dashboard, fetchBenchMetrics])

  // Skills: load when dashboard ready (staggered)
  useEffect(() => {
    if (!project || !dashboard) return
    const timer = setTimeout(async () => {
      try { await fetchSkills() } catch (error) {
        console.error('[fetchSkills-staggered]', error)
        toast.error('Error al cargar habilidades')
      }
    }, 3000)
    return () => clearTimeout(timer)
  }, [project, dashboard, fetchSkills])

  // Shared learnings: load when dashboard ready (staggered)
  useEffect(() => {
    if (!project || !dashboard) return
    const timer = setTimeout(async () => {
      try { await fetchSharedLearnings() } catch (error) {
        console.error('[fetchSharedLearnings-staggered]', error)
        toast.error('Error al cargar aprendizajes compartidos')
      }
    }, 4000)
    return () => clearTimeout(timer)
  }, [project, dashboard, fetchSharedLearnings])

  // Auto-refresh dashboard every 60 seconds when on dashboard tab (reduced from 30s)
  useEffect(() => {
    if (activeTab === 'dashboard' && project) {
      dashboardRefreshRef.current = setInterval(() => {
        fetchDashboard(project.id)
      }, 60000)
    }
    return () => {
      if (dashboardRefreshRef.current) {
        clearInterval(dashboardRefreshRef.current)
        dashboardRefreshRef.current = null
      }
    }
  }, [activeTab, project, fetchDashboard])

  // Auto-select most recent wave when Oleadas tab loads or after wave completion
  useEffect(() => {
    if (activeTab === 'waves' && project && project.waves.length > 0 && !selectedWave && !runningWave && !runningPipeline) {
      setSelectedWave(project.waves[0])
    }
  }, [activeTab, project, selectedWave, runningWave, runningPipeline])

  // Also refresh dashboard after wave completion (includes skills count)
  const fetchProjectWithRefresh = async () => {
    const proj = await fetchProject()
    if (proj) {
      // Stagger: skills after dashboard settles
      setTimeout(() => fetchSkills(), 1000)
    }
    return proj
  }

  const handleSeed = async () => {
    setSeeding(true)
    try {
      const res = await fetch('/api/nexus', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        toast.success(`Agentes sembrados: ${data.agentsCount}`)
        await fetchProjectWithRefresh()
      } else {
        toast.error('Error al sembrar agentes')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setSeeding(false)
    }
  }

  useEffect(() => {
    fetchProjects().then(async (list) => {
      if (list && list.length > 0) {
        // Try localStorage for last selected project
        const savedId = typeof window !== 'undefined' ? localStorage.getItem('nexus-selected-project') : null
        const targetId = savedId && list.some(p => p.id === savedId) ? savedId : list[0].id
        try {
          await fetchProject(targetId)
        } catch (err) {
          console.error('[useNexusData] Error fetching project:', err)
          setLoading(false)
        }
      } else {
        setLoading(false)
      }
    }).catch((err) => {
      console.error('[useNexusData] Error fetching projects:', err)
      setLoading(false)
    })
  }, [fetchProjects, fetchProject])

  // Save selected project to localStorage
  useEffect(() => {
    if (project && typeof window !== 'undefined') {
      localStorage.setItem('nexus-selected-project', project.id)
    }
  }, [project?.id])

  // Lazy-load shared learnings + ChromaDB status when Memory tab is selected
  useEffect(() => {
    if (activeTab === 'memory' && project) {
      if (sharedLearnings.length === 0) fetchSharedLearnings()
      fetchChromaStatus()
    }
  }, [activeTab, project, sharedLearnings.length, fetchSharedLearnings, fetchChromaStatus])

  // Pre-select agents when wave type changes — trust-weighted selection
  useEffect(() => {
    if (!project) return
    const divisions: Record<string, string[]> = {
      brainstorm: ['product', 'marketing', 'design'],
      critique: ['testing', 'specialized', 'engineering'],
      synthesize: ['specialized', 'project-management', 'product'],
      execute: ['engineering'],
      quality_gate: ['testing'],
    }
    if (waveType === 'quality_gate') {
      // For QA, specifically target evidence collectors and reality checkers
      const ids = project.agents
        .filter((pa) => pa.agent.agentId.includes('reality-checker') || pa.agent.agentId.includes('evidence-collector'))
        .slice(0, 4).map((pa) => pa.id)
      setSelectedAgentIds(ids)
    } else {
      const divs = divisions[waveType] || []
      // Filter by division, then sort by trust score (highest first), take top 6
      const candidates = project.agents
        .filter((pa) => divs.includes(pa.agent.division))
        .sort((a, b) => (b.trustScore ?? 0.5) - (a.trustScore ?? 0.5))
        .slice(0, 6)
        .map((pa) => pa.id)
      setSelectedAgentIds(candidates)
    }
  }, [waveType, project])

  const toggleAgent = (id: string) => {
    setSelectedAgentIds((prev) => prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id])
  }

  const parseSSEStream = async (
    reader: ReadableStreamDefaultReader<Uint8Array>,
    onAgentStart: (data: LiveAgentState) => void,
    onAgentResponse: (data: LiveAgentState) => void,
    onAgentDone: (agentId: string, status: string) => void,
    onWaveComplete: (data: { waveNumber: number; totalResponses: number; synthesis: string | null; type: string }) => void,
    onPipelineStep?: (data: { step: number; type: string; label: string }) => void,
    onPipelineStepComplete?: (data: { step: number; type: string }) => void,
    onPipelineComplete?: (data: { totalResponses: number; executiveSummary: string }) => void,
  ) => {
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      let currentEvent = ''
      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7)
        } else if (line.startsWith('data: ') && currentEvent) {
          try {
            const data = JSON.parse(line.slice(6))

            if (currentEvent === 'agent_start') {
              onAgentStart({
                agentId: data.agentId,
                agentName: data.agentName,
                emoji: data.emoji,
                division: data.division,
                status: 'thinking',
                content: '',
                confidence: 0,
                mood: 'neutral',
                pipelineStep: data.pipelineStep,
              })
            } else if (currentEvent === 'agent_response') {
              onAgentResponse({
                agentId: data.agentId,
                agentName: data.agentName,
                emoji: data.emoji,
                division: data.division,
                status: 'done',
                content: data.content,
                confidence: data.confidence,
                mood: data.mood,
                pipelineStep: data.pipelineStep,
              })
            } else if (currentEvent === 'agent_done') {
              onAgentDone(data.agentId, data.status)
            } else if (currentEvent === 'wave_complete') {
              onWaveComplete(data)
            } else if (currentEvent === 'pipeline_step' && onPipelineStep) {
              onPipelineStep(data)
            } else if (currentEvent === 'pipeline_step_complete' && onPipelineStepComplete) {
              onPipelineStepComplete(data)
            } else if (currentEvent === 'pipeline_complete' && onPipelineComplete) {
              onPipelineComplete(data)
            } else if (currentEvent === 'error') {
              toast.error(data.message || 'Error en el stream')
            }
          } catch (error) {
            console.error('[parseSSEStream] Error parsing SSE data:', error)
          }
          currentEvent = ''
        }
      }
    }
  }

  const runWaveStream = async () => {
    if (!project || !wavePrompt.trim()) {
      toast.error('Escribe un problema o descripción')
      return
    }
    if (selectedAgentIds.length === 0) {
      toast.error('Selecciona al menos un agente')
      return
    }

    setRunningWave(true)
    setLiveAgents([])
    setLiveComplete(false)
    setLiveSynthesis(null)
    setLiveWaveType(waveType)
    setActiveTab('waves')

    const abort = new AbortController()
    abortRef.current = abort

    try {
      const res = await fetch('/api/nexus/wave-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          type: waveType,
          prompt: wavePrompt,
          selectedAgentIds,
          specId: waveSpecLink || undefined,
        }),
        signal: abort.signal,
      })

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No se pudo leer el stream')

      await parseSSEStream(
        reader,
        (agent) => {
          setLiveAgents((prev) => [...prev, agent])
          toast.info(`🧠 ${agent.emoji} ${agent.agentName} está pensando...`, { duration: 2000 })
        },
        (agent) => {
          setLiveAgents((prev) => prev.map((a) => a.agentId === agent.agentId ? agent : a))
        },
        (agentId, _status) => {
          setLiveAgents((prev) => {
            const doneCount = prev.filter((a) => a.status === 'done').length
            toast.success(`✅ Agente ${doneCount}/${prev.length} completado`, { duration: 1500 })
            return prev
          })
        },
        (data) => {
          setLiveComplete(true)
          setLiveSynthesis(data.synthesis)
          toast.success(`🎉 Oleada #${data.waveNumber} completada con ${data.totalResponses} respuestas`)
          fetchProject().then((proj) => {
            if (proj && proj.waves.length > 0) {
              setSelectedWave(proj.waves[0])
            }
          }).then(() => fetchSkills())
        },
      )
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      toast.error('Error de conexión al ejecutar oleada')
    } finally {
      setRunningWave(false)
    }
  }

  const runPipelineStream = async () => {
    if (!project || !wavePrompt.trim()) {
      toast.error('Escribe un problema o descripción para el pipeline')
      return
    }

    setRunningPipeline(true)
    setPipelineStep(0)
    setPipelineAgents([])
    setPipelineComplete(false)
    setPipelineSummary(null)
    setRunningWave(true)
    setLiveAgents([])
    setLiveComplete(false)
    setLiveSynthesis(null)
    setLiveWaveType('pipeline')
    setActiveTab('waves')

    const abort = new AbortController()
    abortRef.current = abort

    try {
      const res = await fetch('/api/nexus/pipeline-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          prompt: wavePrompt,
        }),
        signal: abort.signal,
      })

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No se pudo leer el stream')

      await parseSSEStream(
        reader,
        (agent) => {
          setPipelineAgents((prev) => [...prev, agent])
          setLiveAgents((prev) => [...prev, agent])
          toast.info(`🧠 [${agent.pipelineStep || ''}] ${agent.emoji} ${agent.agentName} está pensando...`, { duration: 2000 })
        },
        (agent) => {
          setPipelineAgents((prev) => prev.map((a) => a.agentId === agent.agentId ? agent : a))
          setLiveAgents((prev) => prev.map((a) => a.agentId === agent.agentId ? agent : a))
        },
        (_agentId, _status) => {
          // count done
        },
        (_data) => {
          // wave_complete within pipeline — individual step
        },
        (data) => {
          setPipelineStep(data.step)
          toast.success(`🚀 Pipeline: ${data.label}`, { duration: 3000 })
        },
        (_data) => {
          // step complete
        },
        (data) => {
          setPipelineComplete(true)
          setPipelineSummary(data.executiveSummary)
          setLiveComplete(true)
          setLiveSynthesis(data.executiveSummary)
          toast.success(`🎉 Pipeline completado con ${data.totalResponses} respuestas totales`)
          fetchProject().then((proj) => {
            if (proj && proj.waves.length > 0) {
              setSelectedWave(proj.waves[0])
            }
          }).then(() => fetchSkills())
        },
      )
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      toast.error('Error de conexión al ejecutar pipeline')
    } finally {
      setRunningPipeline(false)
      setRunningWave(false)
    }
  }

  const updateProposalStatus = async (proposalId: string, status: string) => {
    try {
      const res = await fetch(`/api/nexus/proposal?id=${proposalId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      if (data.proposal) {
        toast.success(`Propuesta ${status === 'approved' ? 'aprobada' : status === 'rejected' ? 'rechazada' : 'actualizada'}`)
        await fetchProject()
      }
    } catch {
      toast.error('Error al actualizar propuesta')
    }
  }

  const createSpec = async () => {
    if (!project || !specTitle.trim()) {
      toast.error('Se requiere un título para la especificación')
      return
    }
    setSpecCreating(true)
    try {
      const res = await fetch('/api/nexus/spec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id, title: specTitle.trim(), description: specDescription.trim(), priority: specPriority }),
      })
      const data = await res.json()
      if (data.spec) {
        toast.success(`Spec "${specTitle}" creada`)
        setSpecTitle('')
        setSpecDescription('')
        setSpecPriority('medium')
        await fetchProject()
      }
    } catch {
      toast.error('Error al crear especificación')
    } finally {
      setSpecCreating(false)
    }
  }

  const updateSpecPhase = async (specId: string, phase: string) => {
    try {
      const res = await fetch(`/api/nexus/spec?id=${specId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase }),
      })
      const data = await res.json()
      if (data.spec) {
        const phaseCfg = SPEC_PHASE_CONFIG[phase]
        toast.success(`Fase actualizada a: ${phaseCfg?.label || phase}`)
        await fetchProject()
      }
    } catch {
      toast.error('Error al actualizar fase')
    }
  }

  const updateSpecPriority = async (specId: string, priority: string) => {
    try {
      const res = await fetch(`/api/nexus/spec?id=${specId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority }),
      })
      const data = await res.json()
      if (data.spec) {
        const prioCfg = SPEC_PRIORITY_CONFIG[priority]
        toast.success(`Prioridad actualizada a: ${prioCfg?.label || priority}`)
        await fetchProject()
      }
    } catch {
      toast.error('Error al actualizar prioridad')
    }
  }

  const deleteSpec = async (specId: string) => {
    try {
      const res = await fetch(`/api/nexus/spec?id=${specId}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        toast.success('Especificación eliminada')
        if (selectedSpec?.id === specId) setSelectedSpec(null)
        await fetchProject()
      }
    } catch {
      toast.error('Error al eliminar especificación')
    }
  }

  const createSpecFromWave = async (wave: Wave) => {
    if (!project) return
    const title = `Spec de Oleada #${wave.number} — ${wave.type}`
    const description = wave.result || wave.prompt
    setSpecCreating(true)
    try {
      const res = await fetch('/api/nexus/spec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id, title, description, priority: 'medium' }),
      })
      const data = await res.json()
      if (data.spec) {
        toast.success(`Spec creada desde oleada #${wave.number}`)
        await fetchProject()
      }
    } catch {
      toast.error('Error al crear spec desde oleada')
    } finally {
      setSpecCreating(false)
    }
  }

  const exportData = async (endpoint: string, filename: string) => {
    if (!project) return
    try {
      const url = `/api/nexus/export/${endpoint}?projectId=${project.id}`
      const res = await fetch(url)
      if (!res.ok) {
        toast.error('Error al exportar datos')
        return
      }
      const blob = await res.blob()
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(link.href)
      toast.success(`Exportado: ${filename}`)
    } catch {
      toast.error('Error de conexión al exportar')
    }
  }

  // Derived data — all memoized to prevent O(N×M) recomputation on every render
  const divisions = useMemo(
    () => project ? [...new Set(project.agents.map((pa) => pa.agent.division))] : [],
    [project]
  )

  const filteredAgents = useMemo(() => {
    if (!project) return []
    return project.agents.filter((pa) => {
      if (agentFilter !== 'all' && pa.agent.division !== agentFilter) return false
      if (agentSearch && !pa.agent.name.toLowerCase().includes(agentSearch.toLowerCase()) && !pa.agent.division.toLowerCase().includes(agentSearch.toLowerCase())) return false
      return true
    })
  }, [project, agentFilter, agentSearch])

  // Pre-build agentId→division lookup to avoid O(N×M) in memory filter
  const agentDivisionMap = useMemo(() => {
    if (!project) return new Map<string, string>()
    const map = new Map<string, string>()
    for (const pa of project.agents) {
      map.set(pa.agentId, pa.agent.division)
    }
    return map
  }, [project])

  const filteredMemories = useMemo(() => {
    if (!project) return []
    if (memoryAgentFilter === 'all') return project.memories
    return project.memories.filter((m) => agentDivisionMap.get(m.agentId) === memoryAgentFilter)
  }, [project, memoryAgentFilter, agentDivisionMap])

  // Dashboard stats
  const avgConfidence = useMemo(() => {
    if (!project || project.waves.length === 0) return 0
    let total = 0
    for (const w of project.waves) {
      const responses = w.responses || []
      if (responses.length === 0) continue
      total += responses.reduce((s, r) => s + r.confidence, 0) / responses.length
    }
    return total / project.waves.length
  }, [project])

  const moodCounts = useMemo(() => {
    if (!project) return {}
    const acc: Record<string, number> = {}
    for (const w of project.waves) {
      for (const r of w.responses) {
        acc[r.mood] = (acc[r.mood] || 0) + 1
      }
    }
    return acc
  }, [project])

  // Trust-ranked agents (top 10 by trust score)
  const topTrustedAgents = useMemo(() => {
    if (!project) return []
    return [...project.agents]
      .sort((a, b) => (b.trustScore ?? 0.5) - (a.trustScore ?? 0.5))
      .slice(0, 10)
  }, [project])

  // Average trust score
  const avgTrust = useMemo(() => {
    if (!project || project.agents.length === 0) return 0.5
    return project.agents.reduce((sum, pa) => sum + (pa.trustScore ?? 0.5), 0) / project.agents.length
  }, [project])

  // Benchmarking helpers
  const toggleBenchSort = (field: keyof BenchAgentMetric) => {
    if (benchSortField === field) {
      setBenchSortDir((prev) => prev === 'desc' ? 'asc' : 'desc')
    } else {
      setBenchSortField(field)
      setBenchSortDir('desc')
    }
  }

  const getFilteredSortedMetrics = (): BenchAgentMetric[] => {
    if (!benchMetrics) return []
    let filtered = benchMetrics
    if (benchDivisionFilter !== 'all') {
      filtered = filtered.filter((m) => m.agentDivision === benchDivisionFilter)
    }
    const sorted = [...filtered].sort((a, b) => {
      const aVal = a[benchSortField]
      const bVal = b[benchSortField]
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return benchSortDir === 'desc' ? bVal - aVal : aVal - bVal
      }
      const aStr = String(aVal ?? '')
      const bStr = String(bVal ?? '')
      return benchSortDir === 'desc' ? bStr.localeCompare(aStr) : aStr.localeCompare(bStr)
    })
    return sorted
  }

  return {
    // State
    projects, project, loading, seeding, creatingProject, activeTab, setActiveTab,
    wavePrompt, setWavePrompt, waveType, setWaveType,
    selectedAgentIds, runningWave, agentFilter, setAgentFilter,
    agentSearch, setAgentSearch, selectedAgent, setSelectedAgent,
    memoryAgentFilter, setMemoryAgentFilter,
    selectedWave, setSelectedWave, dialogWave, setDialogWave,
    sharedLearnings, sharedLearningsExpanded, setSharedLearningsExpanded,
    memorySearchQuery, setMemorySearchQuery, memorySearchResults,
    memorySearching, memorySearchType, showMemorySearch, setShowMemorySearch,
    chromaIndexing, chromaStatus, indexChroma, fetchChromaStatus,
    liveAgents, liveComplete, liveSynthesis, liveWaveType,
    runningPipeline, pipelineStep, pipelineAgents, pipelineComplete,
    pipelineSummary,
    benchMetrics, benchAggregates, benchLoading, benchDivisionFilter,
    setBenchDivisionFilter, benchSortField, benchSortDir, benchSelectedAgent,
    setBenchSelectedAgent,
    specTitle, setSpecTitle, specDescription, setSpecDescription,
    specPriority, setSpecPriority, specCreating, specView, setSpecView,
    selectedSpec, setSelectedSpec, waveSpecLink, setWaveSpecLink,
    agentSkills,
    dashboard, systemHealth, activityLogs, waveStats,
    liveConnected: live.connected,
    connectionCount: live.connectionCount,
    lastLiveEvent: live.lastEvent,
    liveEvents: live.events,
    clearLiveEvents: live.clearEvents,

    // Derived
    divisions, filteredAgents, filteredMemories,
    avgConfidence, moodCounts, topTrustedAgents, avgTrust,

    // Actions
    handleSeed, fetchProjectWithRefresh, selectProject, createNewProject, fetchProjects, toggleAgent,
    runWaveStream, runPipelineStream,
    updateProposalStatus, createSpec, updateSpecPhase,
    updateSpecPriority, deleteSpec, createSpecFromWave,
    exportData, fetchBenchMetrics, fetchSkills,
    deleteSkill, handleMemorySearch, toggleBenchSort,
    indexChroma, fetchChromaStatus,
    getFilteredSortedMetrics,
  }
}
