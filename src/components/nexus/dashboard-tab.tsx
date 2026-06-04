'use client'

import React from 'react'
import { motion } from 'framer-motion'
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Activity, Users, Cpu, Search, Play, Loader2,
  Target, CheckCircle2, AlertTriangle, MessageSquare,
  BarChart3, FileText,
  RefreshCw, Clock, Filter,
  Waves, Rocket,
  TrendingUp, Gauge, Calendar, LayoutGrid, X, ExternalLink, Handshake,
  ArrowUpDown, Trophy, Medal, ClipboardList, Plus, Trash2,
  Star, Flame,
  Download, BookOpen,
  HeartPulse, Newspaper, History, ScrollText, Brain,
} from 'lucide-react'
import { WAVE_TYPES, WAVE_COLOR_MAP, WAVE_DOT_COLOR, MOOD_CONFIG, DIVISION_COLORS, TRUST_COLOR, TRUST_BAR_COLOR, TRUST_LABEL } from '@/components/nexus/constants'
import { StatCard } from '@/components/nexus/stat-card'
import type { Project, AgentSkill, BenchAgentMetric, BenchAggregates, DashboardData, Wave, Agent } from '@/components/nexus/types'

interface DashboardTabProps {
  project: Project
  dashboard: DashboardData | null
  agentSkills: AgentSkill[]
  avgConfidence: number
  moodCounts: Record<string, number>
  topTrustedAgents: Array<{ id: string; agent: Agent; trustScore: number | null }>
  avgTrust: number
  benchMetrics: BenchAgentMetric[] | null
  benchAggregates: BenchAggregates | null
  benchLoading: boolean
  benchDivisionFilter: string
  setBenchDivisionFilter: (v: string) => void
  benchSortField: keyof BenchAgentMetric
  benchSortDir: 'asc' | 'desc'
  benchSelectedAgent: BenchAgentMetric | null
  setBenchSelectedAgent: (a: BenchAgentMetric | null) => void
  divisions: string[]
  setActiveTab: (v: string) => void
  setWaveType: (v: string) => void
  fetchBenchMetrics: () => Promise<void>
  exportData: (endpoint: string, filename: string) => Promise<void>
  setSelectedWave: (w: Wave | null) => void
  toggleBenchSort: (field: keyof BenchAgentMetric) => void
  getFilteredSortedMetrics: () => BenchAgentMetric[]
}

export function DashboardTab({
  project, dashboard, agentSkills, avgConfidence, moodCounts,
  topTrustedAgents, avgTrust,
  benchMetrics, benchAggregates, benchLoading, benchDivisionFilter,
  setBenchDivisionFilter, benchSortField, benchSortDir,
  benchSelectedAgent, setBenchSelectedAgent,
  divisions, setActiveTab, setWaveType, fetchBenchMetrics,
  exportData, setSelectedWave, toggleBenchSort, getFilteredSortedMetrics,
}: DashboardTabProps) {
  const systemHealth = dashboard
  const activityLogs = dashboard?.activityLogs ?? []
  const waveStats = dashboard?.waveStats ?? []

  return (
    <>
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Agentes" value={project.agents.length} color="text-cyan-400" />
        <StatCard icon={Waves} label="Oleadas" value={project.waves.length} color="text-amber-400" />
        <StatCard icon={Target} label="Propuestas" value={project.proposals.length} color="text-purple-400" />
        <StatCard icon={FileText} label="Memorias" value={project.memories.length} color="text-emerald-400" />
      </div>

      {/* Salud del Sistema */}
      {systemHealth && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-zinc-200 flex items-center gap-2">
              <HeartPulse className="h-4 w-4 text-emerald-400" />Salud del Sistema
              <Badge variant="outline" className="border-emerald-700 text-emerald-300 text-[10px] ml-auto">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mr-1" />Activo
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs text-zinc-200 font-medium">Sistema Operativo</span>
                </div>
                {systemHealth.systemUptime && (
                  <div className="flex items-center gap-2 text-xs text-zinc-300">
                    <Clock className="h-3 w-3" />
                    <span>Activo desde {new Date(systemHealth.systemUptime).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  </div>
                )}
                {systemHealth.lastWaveAt && (
                  <div className="flex items-center gap-2 text-xs text-zinc-300">
                    <Activity className="h-3 w-3" />
                    <span>Última actividad: {new Date(systemHealth.lastWaveAt).toLocaleString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 pt-1">
                  <span className="text-[10px] text-zinc-300">Agentes: <span className="text-emerald-400 font-medium">{systemHealth.idleAgents} inactivios</span> / <span className="text-amber-400 font-medium">{systemHealth.activeAgents} activos</span></span>
                </div>
                {systemHealth.failedAgents > 0 && (
                  <span className="text-[10px] text-red-400">{systemHealth.failedAgents} agente(s) con error</span>
                )}
              </div>
              <div className="space-y-2">
                <span className="text-xs text-zinc-300 font-medium">Distribución de Oleadas</span>
                <div className="space-y-1.5">
                  {Object.entries(systemHealth.waveTypeDistribution).length === 0 ? (
                    <p className="text-[10px] text-zinc-400">Sin datos aún</p>
                  ) : (
                    Object.entries(systemHealth.waveTypeDistribution)
                      .sort(([, a], [, b]) => b - a)
                      .map(([type, count]) => {
                        const maxCount = Math.max(...Object.values(systemHealth.waveTypeDistribution))
                        const pct = maxCount > 0 ? (count / maxCount) * 100 : 0
                        const wt = WAVE_TYPES.find((w) => w.value === type)
                        return (
                          <div key={type} className="flex items-center gap-2">
                            <span className="text-[10px] text-zinc-300 w-24 truncate">{wt?.label || type}</span>
                            <div className="flex-1 h-3 rounded bg-zinc-800 overflow-hidden">
                              <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5 }} className={`h-full rounded ${WAVE_DOT_COLOR[type] || 'bg-zinc-500'}`} />
                            </div>
                            <span className="text-[10px] text-zinc-200 w-5 text-right">{count}</span>
                          </div>
                        )
                      })
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <span className="text-xs text-zinc-300 font-medium">Divisiones Más Activas</span>
                <div className="space-y-1.5">
                  {Object.entries(systemHealth.divisionActivity).length === 0 ? (
                    <p className="text-[10px] text-zinc-400">Sin datos aún</p>
                  ) : (
                    Object.entries(systemHealth.divisionActivity)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 4)
                      .map(([div, count]) => {
                        const maxCount = Math.max(...Object.values(systemHealth.divisionActivity))
                        const pct = maxCount > 0 ? (count / maxCount) * 100 : 0
                        return (
                          <div key={div} className="flex items-center gap-2">
                            <span className="text-[10px] text-zinc-300 w-28 truncate">{div}</span>
                            <div className="flex-1 h-3 rounded bg-zinc-800 overflow-hidden">
                              <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5 }} className={`h-full rounded ${DIVISION_COLORS[div] || 'bg-zinc-500'}`} />
                            </div>
                            <span className="text-[10px] text-zinc-200 w-5 text-right">{count}</span>
                          </div>
                        )
                      })
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity Feed */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-zinc-200 flex items-center gap-2">
            <Newspaper className="h-4 w-4 text-amber-400" />Feed de Actividad
            <Badge variant="outline" className="border-zinc-700 text-zinc-300 text-[10px] ml-auto">{activityLogs.length} registros</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activityLogs.length === 0 ? (
            <div className="text-center py-8">
              <History className="h-8 w-8 mx-auto mb-2 opacity-30 text-zinc-300" />
              <p className="text-xs text-zinc-300">Sin actividad registrada aún</p>
              <p className="text-[10px] text-zinc-400 mt-1">La actividad se registra al ejecutar oleadas</p>
            </div>
          ) : (
            <ScrollArea className="max-h-64">
              <div className="space-y-1.5">
                {activityLogs.map((log, idx) => {
                  const LOG_TYPE_CONFIG: Record<string, { icon: typeof Activity; color: string }> = {
                    wave_created: { icon: Activity, color: 'text-amber-400' },
                    wave_completed: { icon: CheckCircle2, color: 'text-emerald-400' },
                    skill_learned: { icon: Star, color: 'text-orange-400' },
                    spec_created: { icon: ClipboardList, color: 'text-cyan-400' },
                    proposal_created: { icon: Target, color: 'text-purple-400' },
                    trust_change: { icon: Handshake, color: 'text-emerald-400' },
                    pipeline_started: { icon: Rocket, color: 'text-amber-400' },
                    pipeline_completed: { icon: Trophy, color: 'text-emerald-400' },
                  }
                  const cfg = LOG_TYPE_CONFIG[log.type] || { icon: Activity, color: 'text-zinc-300' }
                  const Icon = cfg.icon
                  const timeAgo = (() => {
                    const now = Date.now()
                    const logTime = new Date(log.createdAt).getTime()
                    const diffMs = now - logTime
                    const diffMin = Math.floor(diffMs / 60000)
                    if (diffMin < 1) return 'ahora mismo'
                    if (diffMin < 60) return `hace ${diffMin} min`
                    const diffH = Math.floor(diffMin / 60)
                    if (diffH < 24) return `hace ${diffH}h`
                    const diffD = Math.floor(diffH / 24)
                    return `hace ${diffD}d`
                  })()
                  return (
                    <motion.div key={log.id} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.02 }} className="flex items-start gap-2.5 p-2 rounded-lg bg-zinc-800/30 border border-zinc-800/50">
                      <Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${cfg.color}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-zinc-200 leading-tight">{log.message}</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">{timeAgo}</p>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Quick Pipeline + Confidence Gauge */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-zinc-200">Ejecución Rápida</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button size="lg" className="w-full bg-gradient-to-r from-amber-600 to-cyan-600 hover:from-amber-700 hover:to-cyan-700 text-white font-semibold" onClick={() => { setActiveTab('waves') }}>
              <Rocket className="mr-2 h-5 w-5" />Ir a Simulación
            </Button>
            <div className="flex flex-wrap gap-2">
              {WAVE_TYPES.map((wt) => {
                const Icon = wt.icon
                return (
                  <Button key={wt.value} size="sm" onClick={() => { setActiveTab('waves'); setWaveType(wt.value) }}
                    className={`${WAVE_COLOR_MAP[wt.value].split(' ')[0]} bg-transparent border border-current/20 hover:bg-current/10 text-xs`}>
                    <Icon className="h-3 w-3 mr-1" />{wt.label}
                  </Button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-orange-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-zinc-200 flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-400" />Auto-Mejora (Habilidades)
              <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/30 text-[10px]">{agentSkills.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {agentSkills.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-xs text-zinc-300">Sin habilidades aprendidas aún</p>
                <p className="text-[10px] text-zinc-400 mt-1">Los agentes desarrollan habilidades automáticamente tras oleadas exitosas</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-zinc-800/50">
                    <p className="text-lg font-bold text-orange-400">{agentSkills.length}</p>
                    <p className="text-[10px] text-zinc-300">Total</p>
                  </div>
                  <div className="p-2 rounded-lg bg-zinc-800/50">
                    <p className="text-lg font-bold text-emerald-400">{agentSkills.filter((s) => s.quality >= 0.7).length}</p>
                    <p className="text-[10px] text-zinc-300">Alta calidad</p>
                  </div>
                  <div className="p-2 rounded-lg bg-zinc-800/50">
                    <p className="text-lg font-bold text-amber-400">{new Set(agentSkills.map((s) => s.agentId)).size}</p>
                    <p className="text-[10px] text-zinc-300">Agentes</p>
                  </div>
                </div>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {agentSkills.slice(0, 4).map((s) => (
                    <div key={s.id} className="flex items-center gap-2 p-1.5 rounded bg-zinc-800/30">
                      <span className="text-sm">{s.agentEmoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium text-zinc-200 truncate">{s.name}</p>
                        <p className="text-[10px] text-zinc-400 truncate">{s.agentName}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Progress value={s.quality * 100} className="h-1 w-12 [&>div]:bg-orange-500" />
                        <span className="text-[10px] text-zinc-300">{Math.round(s.quality * 100)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-zinc-200 flex items-center gap-2">
              <Gauge className="h-4 w-4" />Confianza Promedio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold">{avgConfidence > 0 ? `${Math.round(avgConfidence * 100)}%` : '—'}</span>
                <Badge variant="outline" className={avgConfidence > 0.7 ? 'border-emerald-600 text-emerald-400' : avgConfidence > 0.4 ? 'border-amber-600 text-amber-400' : 'border-zinc-600 text-zinc-200'}>
                  {avgConfidence > 0.7 ? 'Alto' : avgConfidence > 0.4 ? 'Medio' : 'N/A'}
                </Badge>
              </div>
              <Progress value={avgConfidence * 100} className="h-3" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mood + Heatmap */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-zinc-200 flex items-center gap-2">
              <Activity className="h-4 w-4" />Distribución de Estados de Ánimo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(MOOD_CONFIG).map(([key, cfg]) => {
                const Icon = cfg.icon
                const count = moodCounts[key] || 0
                return (
                  <div key={key} className="flex items-center gap-2 p-2.5 rounded-lg bg-zinc-800/50 border border-zinc-800">
                    <Icon className={`h-4 w-4 ${cfg.color}`} />
                    <div className="flex-1">
                      <p className="text-xs font-medium">{cfg.label}</p>
                      <p className="text-lg font-bold">{count}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-zinc-200 flex items-center gap-2">
              <LayoutGrid className="h-4 w-4" />Mapa de Actividad por División
            </CardTitle>
          </CardHeader>
          <CardContent>
            {project.waves.length === 0 ? (
              <div className="text-center py-6 text-zinc-200"><p className="text-xs">Sin datos aún</p></div>
            ) : (
              <div className="space-y-1.5">
                {divisions.map((div) => {
                  const participated = project.waves.filter((w) => w.responses.some((r) => {
                    const pa = project.agents.find((p) => p.id === r.agentId)
                    return pa?.agent.division === div
                  })).length
                  const total = project.waves.length
                  const pct = total > 0 ? Math.round((participated / total) * 100) : 0
                  return (
                    <div key={div} className="flex items-center gap-2">
                      <span className="text-[10px] text-zinc-300 w-28 truncate">{div}</span>
                      <div className="flex-1 h-4 rounded bg-zinc-800 overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5, delay: divisions.indexOf(div) * 0.05 }} className={`h-full rounded ${DIVISION_COLORS[div] || 'bg-zinc-500'}`} />
                      </div>
                      <span className="text-[10px] text-zinc-200 w-6 text-right">{pct}%</span>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Trust Network */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-zinc-200 flex items-center gap-2">
            <Handshake className="h-4 w-4 text-emerald-400" />Red de Confiabilidad
          </CardTitle>
          <CardDescription className="text-xs text-zinc-300">Top 10 agentes más confiables según participación en oleadas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-zinc-300">Confiabilidad Promedio del Equipo</span>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-bold ${TRUST_COLOR(avgTrust)}`}>{Math.round(avgTrust * 100)}%</span>
              <Badge variant="outline" className={`border-current/20 ${TRUST_COLOR(avgTrust)} text-[10px]`}>{TRUST_LABEL(avgTrust)}</Badge>
            </div>
          </div>
          <Progress value={avgTrust * 100} className="h-2 mb-4" />
          <ScrollArea className="max-h-64">
            <div className="space-y-1.5">
              {topTrustedAgents.map((pa, idx) => {
                const trust = pa.trustScore ?? 0.5
                const trustPct = Math.round(trust * 100)
                return (
                  <motion.div key={pa.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.03 }} className="flex items-center gap-3 p-2 rounded-lg bg-zinc-800/30 border border-zinc-800 hover:border-zinc-700 transition-colors">
                    <span className="text-xs font-bold text-zinc-300 w-4 text-center">{idx + 1}</span>
                    <span className="text-lg shrink-0">{pa.agent.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-xs font-medium truncate">{pa.agent.name}</p>
                        <Badge variant="outline" className="border-zinc-700 text-zinc-300 text-[9px] px-1">{pa.agent.division}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded bg-zinc-800 overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${trustPct}%` }} transition={{ duration: 0.5, delay: idx * 0.03 }} className={`h-full rounded ${TRUST_BAR_COLOR(trust)}`} />
                        </div>
                        <span className={`text-[10px] font-bold w-8 text-right ${TRUST_COLOR(trust)}`}>{trustPct}%</span>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </ScrollArea>
          <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-zinc-800">
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500" /><span className="text-[10px] text-zinc-300">Alto (≥70%)</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-500" /><span className="text-[10px] text-zinc-300">Medio (40-69%)</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500" /><span className="text-[10px] text-zinc-300">Bajo (&lt;40%)</span></div>
          </div>
        </CardContent>
      </Card>

      {/* Benchmarking */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium text-zinc-200 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-cyan-400" />Métricas de Agentes
              </CardTitle>
              <CardDescription className="text-xs text-zinc-300 mt-1">Benchmarking detallado por agente</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={benchDivisionFilter} onValueChange={setBenchDivisionFilter}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 h-7 text-[11px] w-32"><Filter className="h-3 w-3 mr-1" /><SelectValue placeholder="División" /></SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="all">Todas</SelectItem>
                  {divisions.map((div) => <SelectItem key={div} value={div}>{div}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-zinc-300 hover:text-zinc-100" onClick={fetchBenchMetrics}>
                <RefreshCw className={`h-3 w-3 ${benchLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {benchLoading && !benchMetrics ? (
            <div className="space-y-2">
              <Skeleton className="h-20 w-full bg-zinc-800" />
              <Skeleton className="h-60 w-full bg-zinc-800" />
            </div>
          ) : (
            <>
              {benchAggregates && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                  <div className="p-2.5 rounded-lg bg-zinc-800/50 border border-zinc-800"><div className="flex items-center gap-1.5 mb-1"><MessageSquare className="h-3 w-3 text-cyan-400" /><span className="text-[10px] text-zinc-300">Respuestas Totales</span></div><p className="text-lg font-bold">{benchAggregates.totalResponses}</p></div>
                  <div className="p-2.5 rounded-lg bg-zinc-800/50 border border-zinc-800"><div className="flex items-center gap-1.5 mb-1"><Gauge className="h-3 w-3 text-amber-400" /><span className="text-[10px] text-zinc-300">Confianza Promedio</span></div><p className="text-lg font-bold">{Math.round(benchAggregates.avgConfidence * 100)}%</p></div>
                  <div className="p-2.5 rounded-lg bg-zinc-800/50 border border-zinc-800"><div className="flex items-center gap-1.5 mb-1"><TrendingUp className="h-3 w-3 text-emerald-400" /><span className="text-[10px] text-zinc-300">Div. Más Activa</span></div><p className="text-sm font-bold truncate">{benchAggregates.mostActiveDivision}</p></div>
                  <div className="p-2.5 rounded-lg bg-zinc-800/50 border border-zinc-800"><div className="flex items-center gap-1.5 mb-1"><Trophy className="h-3 w-3 text-purple-400" /><span className="text-[10px] text-zinc-300">Más Confiable</span></div>{benchAggregates.mostTrustedAgent ? <p className="text-sm font-bold truncate">{benchAggregates.mostTrustedAgent.emoji} {benchAggregates.mostTrustedAgent.name} <span className="text-[10px] text-zinc-300">({Math.round(benchAggregates.mostTrustedAgent.trustScore * 100)}%)</span></p> : <p className="text-sm text-zinc-200">—</p>}</div>
                </div>
              )}
              {benchMetrics && benchMetrics.length > 0 && (
                <ScrollArea className="max-h-80">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 px-2 py-1.5 text-[10px] font-medium text-zinc-300 border-b border-zinc-800">
                      <button onClick={() => toggleBenchSort('trustScore')} className="flex items-center gap-0.5 w-6 hover:text-zinc-100"><ArrowUpDown className="h-2.5 w-2.5" /></button>
                      <button onClick={() => toggleBenchSort('agentName')} className="flex items-center gap-0.5 flex-1 min-w-0 hover:text-zinc-100">Agente{benchSortField === 'agentName' && <ArrowUpDown className="h-2.5 w-2.5" />}</button>
                      <span className="w-16 text-center hidden sm:block">División</span>
                      <button onClick={() => toggleBenchSort('totalWaves')} className="flex items-center gap-0.5 w-14 justify-center hover:text-zinc-100">Oleadas{benchSortField === 'totalWaves' && <ArrowUpDown className="h-2.5 w-2.5 ml-0.5" />}</button>
                      <button onClick={() => toggleBenchSort('avgConfidence')} className="flex items-center gap-0.5 w-16 justify-center hover:text-zinc-100">Conf. %{benchSortField === 'avgConfidence' && <ArrowUpDown className="h-2.5 w-2.5 ml-0.5" />}</button>
                      <button onClick={() => toggleBenchSort('trustScore')} className="flex items-center gap-0.5 w-16 justify-center hover:text-zinc-100">Confia. %{benchSortField === 'trustScore' && <ArrowUpDown className="h-2.5 w-2.5 ml-0.5" />}</button>
                      <button onClick={() => toggleBenchSort('avgResponseLength')} className="flex items-center gap-0.5 w-14 justify-center hover:text-zinc-100 hidden md:block">Long.{benchSortField === 'avgResponseLength' && <ArrowUpDown className="h-2.5 w-2.5 ml-0.5" />}</button>
                      <span className="w-16 text-center hidden lg:block">Estado</span>
                    </div>
                    {getFilteredSortedMetrics().map((m, idx) => {
                      const moodCfg = MOOD_CONFIG[m.dominantMood] || MOOD_CONFIG.neutral
                      const MoodIcon = moodCfg.icon
                      return (
                        <motion.div key={m.projectAgentId} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.015 }} className="flex items-center gap-1 px-2 py-2 rounded-lg bg-zinc-800/20 border border-zinc-800/50 hover:border-zinc-700 hover:bg-zinc-800/50 transition-colors cursor-pointer group" onClick={() => setBenchSelectedAgent(m)}>
                          <span className="text-[10px] font-bold text-zinc-300 w-6 text-center">{m.totalWaves > 0 ? (idx < 3 ? <span className={idx === 0 ? 'text-amber-400' : idx === 1 ? 'text-zinc-300' : 'text-amber-700'}><Medal className="h-3 w-3 inline" /></span> : `#${idx + 1}`) : '—'}</span>
                          <div className="flex-1 min-w-0 flex items-center gap-1.5"><span className="text-sm shrink-0">{m.agentEmoji}</span><span className="text-[11px] font-medium truncate group-hover:text-zinc-100">{m.agentName}</span></div>
                          <Badge variant="outline" className="border-zinc-700 text-zinc-300 text-[8px] px-1 w-16 justify-center hidden sm:block truncate">{m.agentDivision}</Badge>
                          <span className={`text-[11px] font-medium w-14 text-center ${m.totalWaves > 0 ? 'text-zinc-100' : 'text-zinc-200'}`}>{m.totalWaves}</span>
                          <span className={`text-[11px] font-medium w-16 text-center ${m.totalWaves > 0 ? TRUST_COLOR(m.avgConfidence) : 'text-zinc-200'}`}>{m.totalWaves > 0 ? `${Math.round(m.avgConfidence * 100)}%` : '—'}</span>
                          <div className="flex items-center gap-1 w-16 justify-center"><div className="w-8 h-1 rounded bg-zinc-800 overflow-hidden"><div className={`h-full rounded ${TRUST_BAR_COLOR(m.trustScore)}`} style={{ width: `${Math.round(m.trustScore * 100)}%` }} /></div><span className={`text-[10px] font-bold ${TRUST_COLOR(m.trustScore)}`}>{Math.round(m.trustScore * 100)}%</span></div>
                          <span className="text-[11px] font-medium w-14 text-center hidden md:block">{m.totalWaves > 0 ? m.avgResponseLength : '—'}</span>
                          <div className="flex items-center gap-1 w-16 justify-center hidden lg:block">{m.totalWaves > 0 ? (<Badge variant="outline" className={`${moodCfg.color} border-current/20 text-[8px] px-1`}><MoodIcon className="h-2.5 w-2.5 mr-0.5" />{moodCfg.label}</Badge>) : (<span className="text-[10px] text-zinc-200">—</span>)}</div>
                        </motion.div>
                      )
                    })}
                  </div>
                </ScrollArea>
              )}
              {!benchMetrics && !benchLoading && (<div className="text-center py-6 text-zinc-200"><p className="text-xs">Ejecuta oleadas para ver métricas</p></div>)}
            </>
          )}
        </CardContent>
      </Card>

      {/* Bench Agent Detail Dialog */}
      <Dialog open={!!benchSelectedAgent} onOpenChange={() => setBenchSelectedAgent(null)}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-lg">
          {benchSelectedAgent && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="text-2xl">{benchSelectedAgent.agentEmoji}</span>
                  <span>{benchSelectedAgent.agentName}</span>
                  <Badge variant="outline" className="border-zinc-700 ml-2">{benchSelectedAgent.agentDivision}</Badge>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-800"><span className="text-[10px] text-zinc-300">Oleadas Participadas</span><p className="text-xl font-bold">{benchSelectedAgent.totalWaves}</p></div>
                  <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-800"><span className="text-[10px] text-zinc-300">Confiabilidad</span><p className={`text-xl font-bold ${TRUST_COLOR(benchSelectedAgent.trustScore)}`}>{Math.round(benchSelectedAgent.trustScore * 100)}%</p><Progress value={benchSelectedAgent.trustScore * 100} className="h-1.5 mt-1" /></div>
                  <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-800"><span className="text-[10px] text-zinc-300">Confianza Promedio</span><p className="text-xl font-bold">{benchSelectedAgent.totalWaves > 0 ? `${Math.round(benchSelectedAgent.avgConfidence * 100)}%` : '—'}</p></div>
                  <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-800"><span className="text-[10px] text-zinc-300">Tasa de Éxito</span><p className="text-xl font-bold">{benchSelectedAgent.totalWaves > 0 ? `${Math.round(benchSelectedAgent.successRate * 100)}%` : '—'}</p></div>
                </div>
                <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-800"><span className="text-[10px] text-zinc-300">Longitud Promedio de Respuesta</span><p className="text-lg font-bold">{benchSelectedAgent.totalWaves > 0 ? `${benchSelectedAgent.avgResponseLength} caracteres` : '—'}</p></div>
                <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-800">
                  <span className="text-[10px] text-zinc-300 mb-2 block">Distribución de Estados de Ánimo</span>
                  <div className="space-y-1.5">
                    {Object.entries(MOOD_CONFIG).map(([key, cfg]) => {
                      const Icon = cfg.icon
                      const count = benchSelectedAgent.moodDistribution[key] || 0
                      const total = benchSelectedAgent.totalWaves || 1
                      const pct = Math.round((count / total) * 100)
                      return (
                        <div key={key} className="flex items-center gap-2">
                          <Icon className={`h-3 w-3 ${cfg.color}`} /><span className="text-[11px] w-20">{cfg.label}</span>
                          <div className="flex-1 h-2 rounded bg-zinc-800 overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.4 }} className={`h-full rounded ${cfg.color.replace('text-', 'bg-')}`} /></div>
                          <span className="text-[10px] w-12 text-right">{count} ({pct}%)</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Evolución de Oleadas */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-zinc-200 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-cyan-400" />Evolución de Oleadas
            <Badge variant="outline" className="border-zinc-700 text-zinc-300 text-[10px] ml-auto">{waveStats.length} oleadas</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {waveStats.length === 0 ? (
            <div className="text-center py-12"><ScrollText className="h-8 w-8 mx-auto mb-2 opacity-30 text-zinc-300" /><p className="text-xs text-zinc-300">Sin datos de oleadas completadas aún</p><p className="text-[10px] text-zinc-400 mt-1">Ejecuta oleadas para ver la evolución de confianza</p></div>
          ) : (
            <div className="space-y-3">
              <div className="relative" style={{ height: '200px' }}>
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">{[1, 0.75, 0.5, 0.25, 0].map((val) => (<div key={val} className="flex items-center gap-2"><span className="text-[9px] text-zinc-400 w-8 text-right">{Math.round(val * 100)}%</span><div className="flex-1 h-px bg-zinc-800" /></div>))}</div>
                <div className="absolute bottom-0 left-10 right-0 top-0 flex items-end gap-1 px-1">
                  {waveStats.slice(-20).map((ws, idx) => { const barHeight = Math.max(ws.avgConfidence * 100, 2); const barColor = WAVE_DOT_COLOR[ws.type] || 'bg-zinc-500'; return (<motion.div key={ws.waveNumber} initial={{ height: 0 }} animate={{ height: `${barHeight}%` }} transition={{ duration: 0.4, delay: idx * 0.03 }} className={`flex-1 rounded-t-sm ${barColor} relative group cursor-pointer min-w-[12px]`} title={`Oleada #${ws.waveNumber} (${ws.type}) — Confianza: ${Math.round(ws.avgConfidence * 100)}% — ${ws.responseCount} resp.`}><div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[8px] text-zinc-300 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">{Math.round(ws.avgConfidence * 100)}%</div></motion.div>) })}
                </div>
              </div>
              <div className="flex items-center gap-1 pl-10 overflow-x-auto">{waveStats.slice(-20).map((ws) => (<div key={ws.waveNumber} className="flex-1 text-center min-w-[12px]"><span className="text-[8px] text-zinc-400">#{ws.waveNumber}</span></div>))}</div>
              <div className="flex items-center gap-4 pt-2 border-t border-zinc-800 flex-wrap">{WAVE_TYPES.map((wt) => (<div key={wt.value} className="flex items-center gap-1.5"><div className={`w-2.5 h-2.5 rounded-sm ${WAVE_DOT_COLOR[wt.value]}`} /><span className="text-[9px] text-zinc-300">{wt.label}</span></div>))}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-zinc-200 flex items-center gap-2"><Download className="h-4 w-4" />Exportar Datos</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-200 hover:bg-zinc-800 hover:text-zinc-100 justify-start gap-2 h-auto py-2.5 px-3" onClick={() => exportData('waves?format=json', 'nexus-oleadas.json')}><Download className="h-3.5 w-3.5 text-cyan-400" /><div className="text-left"><span className="text-xs font-medium block">Oleadas (JSON)</span><span className="text-[10px] text-zinc-400">Oleadas + Respuestas</span></div><Badge variant="outline" className="ml-auto border-cyan-800 text-cyan-400 text-[9px] px-1.5">JSON</Badge></Button>
            <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-200 hover:bg-zinc-800 hover:text-zinc-100 justify-start gap-2 h-auto py-2.5 px-3" onClick={() => exportData('waves?format=csv', 'nexus-oleadas.csv')}><Download className="h-3.5 w-3.5 text-emerald-400" /><div className="text-left"><span className="text-xs font-medium block">Oleadas (CSV)</span><span className="text-[10px] text-zinc-400">Tabla con datos</span></div><Badge variant="outline" className="ml-auto border-emerald-800 text-emerald-400 text-[9px] px-1.5">CSV</Badge></Button>
            <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-200 hover:bg-zinc-800 hover:text-zinc-100 justify-start gap-2 h-auto py-2.5 px-3" onClick={() => exportData('metrics?format=json', 'nexus-metricas.json')}><Download className="h-3.5 w-3.5 text-amber-400" /><div className="text-left"><span className="text-xs font-medium block">Métricas</span><span className="text-[10px] text-zinc-400">Rendimiento por agente</span></div><Badge variant="outline" className="ml-auto border-amber-800 text-amber-400 text-[9px] px-1.5">JSON</Badge></Button>
            <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-200 hover:bg-zinc-800 hover:text-zinc-100 justify-start gap-2 h-auto py-2.5 px-3" onClick={() => exportData('metrics?format=csv', 'nexus-metricas.csv')}><Download className="h-3.5 w-3.5 text-emerald-400" /><div className="text-left"><span className="text-xs font-medium block">Métricas (CSV)</span><span className="text-[10px] text-zinc-400">Tabla de métricas</span></div><Badge variant="outline" className="ml-auto border-emerald-800 text-emerald-400 text-[9px] px-1.5">CSV</Badge></Button>
            <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-200 hover:bg-zinc-800 hover:text-zinc-100 justify-start gap-2 h-auto py-2.5 px-3" onClick={() => exportData('memories', 'nexus-memorias.json')}><Download className="h-3.5 w-3.5 text-purple-400" /><div className="text-left"><span className="text-xs font-medium block">Memorias</span><span className="text-[10px] text-zinc-400">Aprendizajes de agentes</span></div><Badge variant="outline" className="ml-auto border-purple-800 text-purple-400 text-[9px] px-1.5">JSON</Badge></Button>
            <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-200 hover:bg-zinc-800 hover:text-zinc-100 justify-start gap-2 h-auto py-2.5 px-3" onClick={() => exportData('project', 'nexus-proyecto-completo.json')}><Download className="h-3.5 w-3.5 text-rose-400" /><div className="text-left"><span className="text-xs font-medium block">Proyecto Completo</span><span className="text-[10px] text-zinc-400">Todo en un archivo</span></div><Badge variant="outline" className="ml-auto border-rose-800 text-rose-400 text-[9px] px-1.5">JSON</Badge></Button>
          </div>
        </CardContent>
      </Card>

      {/* Wave Timeline */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-zinc-200 flex items-center gap-2"><TrendingUp className="h-4 w-4" />Línea Temporal de Oleadas</CardTitle></CardHeader>
        <CardContent>
          {project.waves.length === 0 ? (
            <div className="text-center py-8 text-zinc-300"><Waves className="h-8 w-8 mx-auto mb-2 opacity-50" /><p className="text-sm">No hay oleadas ejecutadas todavía</p><Button variant="ghost" size="sm" className="mt-2 text-emerald-400" onClick={() => setActiveTab('waves')}>Ir a Oleadas →</Button></div>
          ) : (
            <ScrollArea className="max-h-80">
              <div className="relative pl-6">
                <div className="absolute left-[11px] top-0 bottom-0 w-px bg-zinc-800" />
                <div className="space-y-4">
                  {project.waves.slice(0, 10).map((wave, idx) => (
                    <motion.div key={wave.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }} className="relative flex items-start gap-3 cursor-pointer group" onClick={() => setSelectedWave(wave)}>
                      <div className={`absolute -left-6 top-1 w-3 h-3 rounded-full border-2 border-zinc-950 ${WAVE_DOT_COLOR[wave.type] || 'bg-zinc-500'}`} />
                      <div className="flex-1 p-3 rounded-lg bg-zinc-800/30 border border-zinc-800 group-hover:border-zinc-700 transition-colors">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className={`${WAVE_COLOR_MAP[wave.type]} text-[10px]`}>{wave.type}</Badge>
                          <span className="text-xs font-medium">Oleada #{wave.number}</span>
                          <span className="text-[10px] text-zinc-200 ml-auto flex items-center gap-1"><Calendar className="h-2.5 w-2.5" />{new Date(wave.createdAt).toLocaleDateString('es', { day: '2-digit', month: 'short' })}</span>
                        </div>
                        <p className="text-xs text-zinc-300 truncate">{wave.prompt.slice(0, 100)}</p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-[10px] text-zinc-200 flex items-center gap-1"><MessageSquare className="h-2.5 w-2.5" />{wave.responses.length} respuestas</span>
                          {wave.result && <span className="text-[10px] text-cyan-400 flex items-center gap-1"><Brain className="h-2.5 w-2.5" />Síntesis</span>}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </>
  )
}
