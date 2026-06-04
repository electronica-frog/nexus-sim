// ===== Constants =====
import {
  Lightbulb, AlertTriangle, Brain, Zap, Shield, Sparkles, Activity, Eye,
} from 'lucide-react'

export const WAVE_TYPES = [
  { value: 'brainstorm', label: 'Lluvia de Ideas', icon: Lightbulb, color: 'amber' },
  { value: 'critique', label: 'Crítica', icon: AlertTriangle, color: 'red' },
  { value: 'synthesize', label: 'Síntesis', icon: Brain, color: 'cyan' },
  { value: 'execute', label: 'Ejecución', icon: Zap, color: 'emerald' },
  { value: 'quality_gate', label: 'Control de Calidad', icon: Shield, color: 'purple' },
] as const

export const WAVE_COLOR_MAP: Record<string, string> = {
  brainstorm: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
  critique: 'text-red-400 bg-red-400/10 border-red-400/30',
  synthesize: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30',
  execute: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
  quality_gate: 'text-purple-400 bg-purple-400/10 border-purple-400/30',
}

export const WAVE_DOT_COLOR: Record<string, string> = {
  brainstorm: 'bg-amber-500',
  critique: 'bg-red-500',
  synthesize: 'bg-cyan-500',
  execute: 'bg-emerald-500',
  quality_gate: 'bg-purple-500',
}

export const WAVE_LINE_COLOR: Record<string, string> = {
  brainstorm: 'border-amber-500',
  critique: 'border-red-500',
  synthesize: 'border-cyan-500',
  execute: 'border-emerald-500',
  quality_gate: 'border-purple-500',
}

export const STATUS_COLOR_MAP: Record<string, string> = {
  idle: 'bg-zinc-500',
  thinking: 'bg-amber-500 animate-pulse',
  done: 'bg-emerald-500',
  failed: 'bg-red-500',
}

export const MOOD_CONFIG: Record<string, { icon: typeof Activity; color: string; label: string }> = {
  enthusiastic: { icon: Sparkles, color: 'text-emerald-400', label: 'Entusiasta' },
  neutral: { icon: Activity, color: 'text-zinc-200', label: 'Neutral' },
  skeptical: { icon: Eye, color: 'text-amber-400', label: 'Escéptico' },
  concerned: { icon: AlertTriangle, color: 'text-red-400', label: 'Preocupado' },
}

export const PROPOSAL_STATUS_MAP: Record<string, { color: string; label: string }> = {
  proposed: { color: 'border-zinc-500 text-zinc-300', label: 'Propuesta' },
  approved: { color: 'border-emerald-500 text-emerald-300', label: 'Aprobada' },
  rejected: { color: 'border-red-500 text-red-300', label: 'Rechazada' },
  implemented: { color: 'border-cyan-500 text-cyan-300', label: 'Implementada' },
}

export const MEMORY_TYPE_COLORS: Record<string, string> = {
  fact: 'bg-blue-500/20 text-blue-300',
  learning: 'bg-emerald-500/20 text-emerald-300',
  preference: 'bg-purple-500/20 text-purple-300',
  pattern: 'bg-amber-500/20 text-amber-300',
}

export const DIVISION_COLORS: Record<string, string> = {
  engineering: 'bg-cyan-500',
  product: 'bg-amber-500',
  design: 'bg-purple-500',
  marketing: 'bg-pink-500',
  testing: 'bg-red-500',
  specialized: 'bg-emerald-500',
  'project-management': 'bg-zinc-400',
}

export const PIPELINE_STEPS = [
  { type: 'brainstorm', label: 'Paso 1/5: Lluvia de Ideas', icon: Lightbulb },
  { type: 'critique', label: 'Paso 2/5: Crítica', icon: AlertTriangle },
  { type: 'synthesize', label: 'Paso 3/5: Síntesis', icon: Brain },
  { type: 'execute', label: 'Paso 4/5: Ejecución', icon: Zap },
  { type: 'quality_gate', label: 'Paso 5/5: QA', icon: Shield },
]

export const SPEC_PHASE_CONFIG: Record<string, { color: string; label: string; bg: string }> = {
  draft: { color: 'text-zinc-300', label: 'Borrador', bg: 'bg-zinc-500/20 border-zinc-500/40' },
  design: { color: 'text-amber-300', label: 'Diseño', bg: 'bg-amber-500/20 border-amber-500/40' },
  implementation: { color: 'text-cyan-300', label: 'Implementación', bg: 'bg-cyan-500/20 border-cyan-500/40' },
  review: { color: 'text-purple-300', label: 'Revisión', bg: 'bg-purple-500/20 border-purple-500/40' },
  completed: { color: 'text-emerald-300', label: 'Completado', bg: 'bg-emerald-500/20 border-emerald-500/40' },
}

export const SPEC_PRIORITY_CONFIG: Record<string, { color: string; label: string }> = {
  low: { color: 'text-zinc-300 border-zinc-500/40', label: 'Baja' },
  medium: { color: 'text-amber-300 border-amber-500/40', label: 'Media' },
  high: { color: 'text-orange-300 border-orange-500/40', label: 'Alta' },
  critical: { color: 'text-red-400 border-red-500/40', label: 'Crítica' },
}

export const SPEC_PHASES = ['draft', 'design', 'implementation', 'review', 'completed']

export const TRUST_COLOR = (score: number): string => {
  if (score >= 0.7) return 'text-emerald-400'
  if (score >= 0.4) return 'text-amber-400'
  return 'text-red-400'
}

export const TRUST_BAR_COLOR = (score: number): string => {
  if (score >= 0.7) return 'bg-emerald-500'
  if (score >= 0.4) return 'bg-amber-500'
  return 'bg-red-500'
}

export const TRUST_LABEL = (score: number): string => {
  if (score >= 0.7) return 'Alto'
  if (score >= 0.4) return 'Medio'
  return 'Bajo'
}
