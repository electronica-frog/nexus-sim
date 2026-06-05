'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Gavel, Play, Loader2, TrendingUp, Star, AlertTriangle,
  CheckCircle2, Target, Lightbulb, BarChart3, Clock,
} from 'lucide-react'

interface JudgeDimension {
  name: string
  score: number
  justification: string
}

interface JudgeResult {
  waveId: string
  projectId: string
  judgeName: string
  dimensions: JudgeDimension[]
  overallScore: number
  feedback: string
  improvements: string[]
  highlights: {
    best: string[]
    worst: string[]
  }
  tokensUsed: number
  evaluatedAt: string
}

interface EvaluationLog {
  id: string
  waveId: string
  waveNumber: number
  overallScore: number
  dimensions?: JudgeDimension[]
  highlights?: { best: string[]; worst: string[] }
  tokensUsed?: number
  trustAdjustments?: Array<{ agentId: string; delta: number; reason: string }>
  evaluatedAt: string
  message?: string
}

function getScoreColor(score: number): string {
  if (score >= 0.85) return 'text-emerald-400'
  if (score >= 0.7) return 'text-green-400'
  if (score >= 0.55) return 'text-amber-400'
  if (score >= 0.4) return 'text-orange-400'
  return 'text-red-400'
}

function getScoreBg(score: number): string {
  if (score >= 0.85) return 'bg-emerald-500/20 border-emerald-500/30'
  if (score >= 0.7) return 'bg-green-500/20 border-green-500/30'
  if (score >= 0.55) return 'bg-amber-500/20 border-amber-500/30'
  if (score >= 0.4) return 'bg-orange-500/20 border-orange-500/30'
  return 'bg-red-500/20 border-red-500/30'
}

function getScoreLabel(score: number): string {
  if (score >= 0.85) return 'Excelente'
  if (score >= 0.7) return 'Bueno'
  if (score >= 0.55) return 'Aceptable'
  if (score >= 0.4) return 'Bajo'
  return 'Crítico'
}

function getProgressColor(score: number): string {
  if (score >= 0.85) return '[&>div]:bg-emerald-500'
  if (score >= 0.7) return '[&>div]:bg-green-500'
  if (score >= 0.55) return '[&>div]:bg-amber-500'
  if (score >= 0.4) return '[&>div]:bg-orange-500'
  return '[&>div]:bg-red-500'
}

const DIMENSION_EMOJIS: Record<string, string> = {
  RELEVANCIA: '🎯',
  PROFUNDIDAD: '🔬',
  CREATIVIDAD: '💡',
  COHERENCIA: '🔗',
  ACCIONABILIDAD: '⚡',
}

interface JudgesTabProps {
  projectId: string
}

export function JudgesTab({ projectId }: JudgesTabProps) {
  const [evaluations, setEvaluations] = useState<EvaluationLog[]>([])
  const [loading, setLoading] = useState(true)
  const [evaluating, setEvaluating] = useState(false)
  const [selectedWaveId, setSelectedWaveId] = useState('')
  const [currentResult, setCurrentResult] = useState<JudgeResult | null>(null)
  const [error, setError] = useState('')

  // Fetch evaluation history
  const fetchEvaluations = useCallback(async () => {
    try {
      const res = await fetch(`/api/nexus/llm-judge?projectId=${projectId}`)
      if (res.ok) {
        const data = await res.json()
        setEvaluations(data.evaluations || [])
      }
    } catch (e) {
      console.error('Error fetching evaluations:', e)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchEvaluations()
  }, [fetchEvaluations])

  // Evaluate a wave
  const handleEvaluate = async () => {
    if (!selectedWaveId) return
    setEvaluating(true)
    setError('')
    setCurrentResult(null)

    try {
      const res = await fetch('/api/nexus/llm-judge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ waveId: selectedWaveId, projectId }),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Error en evaluación')
      }

      const data = await res.json()
      setCurrentResult(data.evaluation)
      fetchEvaluations() // Refresh history
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setEvaluating(false)
    }
  }

  // Find waves to evaluate
  const [availableWaves, setAvailableWaves] = useState<Array<{ id: string; number: number; type: string; status: string; prompt: string }>>([])

  useEffect(() => {
    async function fetchWaves() {
      try {
        const res = await fetch(`/api/nexus/waves?projectId=${projectId}&limit=20`)
        if (res.ok) {
          const data = await res.json()
          setAvailableWaves((data.waves || []).filter((w: { status: string }) => w.status === 'completed'))
        }
      } catch {
        // ignore
      }
    }
    if (projectId) fetchWaves()
  }, [projectId])

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Gavel className="h-5 w-5 text-purple-400" />
            LLM Judges — Evaluación Automática
          </CardTitle>
          <CardDescription className="text-zinc-300 text-sm">
            Agentes juez que evalúan la calidad de cada oleada en 5 dimensiones
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Evaluation Controls */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
            <div className="flex-1 space-y-1">
              <label className="text-xs text-zinc-300 font-medium">Seleccionar Oleada Completada</label>
              <select
                value={selectedWaveId}
                onChange={(e) => setSelectedWaveId(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              >
                <option value="">— Elegí una oleada —</option>
                {availableWaves.map((w) => (
                  <option key={w.id} value={w.id}>
                    #{w.number} [{w.type}] — {w.prompt.slice(0, 60)}...
                  </option>
                ))}
              </select>
            </div>
            <Button
              onClick={handleEvaluate}
              disabled={!selectedWaveId || evaluating}
              className="bg-purple-600 hover:bg-purple-700 text-white shrink-0"
            >
              {evaluating ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Evaluando...</>
              ) : (
                <><Play className="h-4 w-4 mr-2" />Evaluar Oleada</>
              )}
            </Button>
          </div>

          {/* Dimensions Legend */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(DIMENSION_EMOJIS).map(([name, emoji]) => (
              <Badge key={name} variant="outline" className="border-zinc-700 text-zinc-300 text-[10px]">
                {emoji} {name.charAt(0) + name.slice(1).toLowerCase()}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Card className="bg-red-950/30 border-red-800/50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
            <p className="text-sm text-red-300">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Current Result */}
      {currentResult && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="bg-zinc-900 border-purple-500/30">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Star className="h-4 w-4 text-purple-400" />
                  Resultado de Evaluación
                </CardTitle>
                <Badge className={`${getScoreBg(currentResult.overallScore)} border text-xs`}>
                  {getScoreLabel(currentResult.overallScore)} — {(currentResult.overallScore * 100).toFixed(0)}%
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Overall Score */}
              <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-zinc-300 font-medium">Score Global Ponderado</span>
                  <span className={`text-2xl font-bold ${getScoreColor(currentResult.overallScore)}`}>
                    {(currentResult.overallScore * 100).toFixed(0)}%
                  </span>
                </div>
                <Progress value={currentResult.overallScore * 100} className={`h-3 ${getProgressColor(currentResult.overallScore)}`} />
              </div>

              {/* Dimensions Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {currentResult.dimensions.map((dim, i) => (
                  <motion.div
                    key={dim.name}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{DIMENSION_EMOJIS[dim.name] || '📊'}</span>
                        <span className="text-xs font-medium text-zinc-200">{dim.name}</span>
                      </div>
                      <span className={`text-sm font-bold ${getScoreColor(dim.score)}`}>
                        {(dim.score * 100).toFixed(0)}%
                      </span>
                    </div>
                    <Progress value={dim.score * 100} className={`h-1.5 ${getProgressColor(dim.score)}`} />
                    <p className="text-[11px] text-zinc-400 leading-relaxed">{dim.justification}</p>
                  </motion.div>
                ))}
              </div>

              {/* Feedback */}
              <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                <div className="flex items-center gap-1.5 mb-2">
                  <Target className="h-3.5 w-3.5 text-purple-400" />
                  <span className="text-xs font-medium text-zinc-200">Evaluación Cualitativa</span>
                </div>
                <p className="text-sm text-zinc-300 leading-relaxed">{currentResult.feedback}</p>
              </div>

              {/* Improvements + Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-xs font-medium text-zinc-200">Sugerencias de Mejora</span>
                  </div>
                  <ul className="space-y-1">
                    {currentResult.improvements.map((imp, i) => (
                      <li key={i} className="text-xs text-zinc-300 flex items-start gap-1.5">
                        <span className="text-amber-400 mt-0.5">•</span>
                        {imp}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                  <div className="flex items-center gap-1.5 mb-2">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-xs font-medium text-zinc-200">Highlights</span>
                  </div>
                  <div className="space-y-2">
                    {currentResult.highlights.best.length > 0 && (
                      <div>
                        <span className="text-[10px] text-emerald-400 font-medium">Mejores:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {currentResult.highlights.best.map((name) => (
                            <Badge key={name} variant="outline" className="border-emerald-500/30 text-emerald-300 text-[10px]">
                              <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />{name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {currentResult.highlights.worst.length > 0 && (
                      <div>
                        <span className="text-[10px] text-orange-400 font-medium">A mejorar:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {currentResult.highlights.worst.map((name) => (
                            <Badge key={name} variant="outline" className="border-orange-500/30 text-orange-300 text-[10px]">
                              <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />{name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Meta info */}
              <div className="flex items-center gap-3 text-[10px] text-zinc-500">
                <span>Juez: {currentResult.judgeName}</span>
                <span>Tokens: {currentResult.tokensUsed}</span>
                <span>{new Date(currentResult.evaluatedAt).toLocaleString('es-AR')}</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Evaluation History */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-zinc-400" />
            Historial de Evaluaciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 bg-zinc-800" />)}
            </div>
          ) : evaluations.length === 0 ? (
            <p className="text-sm text-zinc-400 text-center py-8">
              No hay evaluaciones aún. Seleccioná una oleada completada y evaluá.
            </p>
          ) : (
            <div className="space-y-2">
              {evaluations.map((ev, i) => (
                <motion.div
                  key={ev.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50"
                >
                  <div className={`text-lg font-bold w-12 text-center ${getScoreColor(ev.overallScore)}`}>
                    {ev.overallScore !== undefined ? `${(ev.overallScore * 100).toFixed(0)}%` : '—'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-zinc-200">
                        Oleada #{ev.waveNumber}
                      </span>
                      {ev.dimensions && (
                        <div className="flex gap-1">
                          {ev.dimensions.slice(0, 3).map((d) => (
                            <span key={d.name} className="text-[10px] text-zinc-500">
                              {DIMENSION_EMOJIS[d.name] || ''}{(d.score * 100).toFixed(0)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {ev.trustAdjustments && ev.trustAdjustments.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {ev.trustAdjustments.slice(0, 2).map((adj, j) => (
                          <Badge key={j} variant="outline" className={`text-[9px] ${adj.delta > 0 ? 'border-emerald-500/30 text-emerald-300' : 'border-orange-500/30 text-orange-300'}`}>
                            {adj.delta > 0 ? '+' : ''}{adj.delta.toFixed(2)} trust
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-zinc-500 shrink-0">
                    <Clock className="h-3 w-3" />
                    {new Date(ev.evaluatedAt).toLocaleDateString('es-AR')}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
