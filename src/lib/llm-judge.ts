/**
 * LLM Judges — NEXUS Sim v2
 *
 * Meta-evaluation system: specialized "judge" agents that automatically
 * score wave quality, creating a continuous improvement loop.
 *
 * Architecture:
 *   Wave completes → Judge evaluates → Scores feed back into trust + skills + memory
 *
 * Each judge scores on multiple dimensions:
 *   - Relevancia: How well did agents address the prompt/problem?
 *   - Profundidad: Quality of analysis, not surface-level responses
 *   - Creatividad: Novel ideas, unique perspectives, innovative thinking
 *   - Coherencia: Internal consistency, logical flow, structured output
 *   - Accionabilidad: Are the outputs actionable and specific?
 *
 * Judges also provide:
 *   - General feedback ( qualitative assessment)
 *   - Improvement suggestions for next wave
 *   - Agent-level highlights (who performed best/worst)
 */

import ZAI from 'z-ai-web-dev-sdk'

// ===== TYPES =====

export interface JudgeDimension {
  name: string
  score: number // 0-1
  justification: string
}

export interface JudgeResult {
  waveId: string
  projectId: string
  judgeName: string
  dimensions: JudgeDimension[]
  overallScore: number // 0-1, weighted average
  feedback: string // Qualitative assessment
  improvements: string[] // Suggestions for next wave
  highlights: {
    best: string[] // Agent names that performed well
    worst: string[] // Agent names that underperformed
  }
  tokensUsed: number
  evaluatedAt: string
}

export interface WaveEvaluationData {
  projectId: string
  waveId: string
  waveNumber: number
  waveType: string
  prompt: string
  responses: Array<{
    agentName: string
    agentId: string
    division: string
    content: string
    confidence: number
    mood: string
  }>
  result?: string // Synthesized result if available
}

// ===== JUDGE CONFIGURATION =====

const JUDGE_PROMPT = `Eres un Juez Evaluador en el sistema NEXUS Sim v2. Tu función es evaluar la calidad de las respuestas de agentes en una oleada de simulación.

## Contexto
Se ejecutó una oleada de tipo "{waveType}" con {responseCount} agentes respondiendo al siguiente prompt:
"{prompt}"

## Respuestas de los Agentes
{responses}

{resultSection}

## Dimensiones de Evaluación
Evaluá cada dimensión en escala 0.0 a 1.0 con una justificación breve (1-2 oraciones):

1. **RELEVANCIA** (peso: 0.25): ¿Qué tan bien addressaron los agentes el prompt/problema?
2. **PROFUNDIDAD** (peso: 0.25): ¿Las respuestas tienen análisis sustancial o son superficiales?
3. **CREATIVIDAD** (peso: 0.20): ¿Hay ideas novedosas, perspectivas únicas, pensamiento innovador?
4. **COHERENCIA** (peso: 0.15): ¿Las respuestas son lógicas, consistentes y bien estructuradas?
5. **ACCIONABILIDAD** (peso: 0.15): ¿Los outputs son específicos y accionables?

## Formato de Respuesta (obligatorio)
Respondé EXACTAMENTE en este formato JSON, sin texto adicional:

\`\`\`json
{
  "dimensions": [
    { "name": "RELEVANCIA", "score": 0.X, "justification": "..." },
    { "name": "PROFUNDIDAD", "score": 0.X, "justification": "..." },
    { "name": "CREATIVIDAD", "score": 0.X, "justification": "..." },
    { "name": "COHERENCIA", "score": 0.X, "justification": "..." },
    { "name": "ACCIONABILIDAD", "score": 0.X, "justification": "..." }
  ],
  "feedback": "Evaluación general cualitativa de la oleada (3-5 oraciones)...",
  "improvements": ["Sugerencia 1", "Sugerencia 2", "Sugerencia 3"],
  "highlights": {
    "best": ["Nombre del agente 1", "Nombre del agente 2"],
    "worst": ["Nombre del agente 3"]
  }
}
\`\`\`

IMPORTANTE: Solo respondé con el JSON, sin markdown ni texto adicional.`

const DIMENSION_WEIGHTS: Record<string, number> = {
  RELEVANCIA: 0.25,
  PROFUNDIDAD: 0.25,
  CREATIVIDAD: 0.20,
  COHERENCIA: 0.15,
  ACCIONABILIDAD: 0.15,
}

// ===== MAIN EVALUATION FUNCTION =====

export async function evaluateWave(data: WaveEvaluationData): Promise<JudgeResult> {
  const { projectId, waveId, waveNumber, waveType, prompt, responses, result } = data

  // Build response section
  const responseText = responses.map((r, i) => {
    const confEmoji = r.confidence >= 0.7 ? '🟢' : r.confidence >= 0.4 ? '🟡' : '🔴'
    const moodEmoji = { enthusiastic: '🔥', neutral: '😐', skeptical: '🤔', concerned: '⚠️' }[r.mood] || '😐'
    return `### Agente ${i + 1}: ${r.agentName} (${r.division}) ${moodEmoji} ${confEmoji} ${(r.confidence * 100).toFixed(0)}%
${r.content.slice(0, 800)}${r.content.length > 800 ? '...' : ''}`
  }).join('\n\n')

  const resultSection = result ? `\n## Resultado Sintetizado de la Oleada\n${result.slice(0, 600)}` : ''

  // Fill the template
  const fullPrompt = JUDGE_PROMPT
    .replace(/{waveType}/g, waveType)
    .replace(/{responseCount}/g, String(responses.length))
    .replace(/{prompt}/g, prompt)
    .replace(/{responses}/g, responseText)
    .replace(/{resultSection}/g, resultSection)

  try {
    const zai = await ZAI.create()
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: 'Sos un evaluador experto que produce solo JSON válido. No agregues texto fuera del JSON.' },
        { role: 'user', content: fullPrompt },
      ],
      temperature: 0.3, // Low temperature for consistent evaluations
    })

    const rawContent = completion.choices?.[0]?.message?.content || ''
    const tokensUsed = completion.usage?.total_tokens || 0

    // Parse JSON from response
    const parsed = parseJudgeResponse(rawContent)
    if (parsed) {
      // Calculate weighted overall score
      const overallScore = parsed.dimensions.reduce((sum, d) => {
        return sum + (d.score * (DIMENSION_WEIGHTS[d.name] || 0.2))
      }, 0)

      return {
        waveId,
        projectId,
        judgeName: `Juez-NEXUS-v2`,
        dimensions: parsed.dimensions,
        overallScore: Math.min(1, Math.max(0, overallScore)),
        feedback: parsed.feedback,
        improvements: parsed.improvements,
        highlights: parsed.highlights,
        tokensUsed,
        evaluatedAt: new Date().toISOString(),
      }
    }

    // If parsing fails, return default scores
    return createFallbackResult(data, tokensUsed)
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Error desconocido'
    console.error(`[LLM Judge] Error evaluando wave ${waveId}:`, errMsg)
    return createFallbackResult(data, 0)
  }
}

// ===== JSON PARSER =====

function parseJudgeResponse(raw: string): {
  dimensions: Array<{ name: string; score: number; justification: string }>
  feedback: string
  improvements: string[]
  highlights: { best: string[]; worst: string[] }
} | null {
  try {
    // Try direct parse first
    return JSON.parse(raw)
  } catch {
    // Try extracting JSON from markdown code block
    const jsonMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1])
      } catch {
        // Try finding first { ... } block
        const braceMatch = raw.match(/\{[\s\S]*\}/)
        if (braceMatch) {
          try {
            return JSON.parse(braceMatch[0])
          } catch {
            return null
          }
        }
      }
    }
    return null
  }
}

// ===== FALLBACK =====

function createFallbackResult(data: WaveEvaluationData, tokensUsed: number): JudgeResult {
  const avgConfidence = data.responses.length > 0
    ? data.responses.reduce((s, r) => s + r.confidence, 0) / data.responses.length
    : 0.5
  const enthusiasticCount = data.responses.filter(r => r.mood === 'enthusiastic').length
  const responseRatio = Math.min(1, data.responses.length / 10)

  return {
    waveId: data.waveId,
    projectId: data.projectId,
    judgeName: 'Juez-NEXUS-Fallback',
    dimensions: [
      { name: 'RELEVANCIA', score: Math.round(avgConfidence * 100) / 100, justification: 'Basado en confianza promedio de agentes (fallback)' },
      { name: 'PROFUNDIDAD', score: Math.round(Math.min(1, avgConfidence * 0.9) * 100) / 100, justification: 'Estimado desde confidence scores (fallback)' },
      { name: 'CREATIVIDAD', score: Math.round(Math.min(1, enthusiasticCount / Math.max(1, data.responses.length) * 1.5) * 100) / 100, justification: `Basado en ${enthusiasticCount} agentes entusiastas de ${data.responses.length}` },
      { name: 'COHERENCIA', score: Math.round((avgConfidence * 0.8 + 0.2) * 100) / 100, justification: 'Score base con ajuste mínimo (fallback)' },
      { name: 'ACCIONABILIDAD', score: Math.round(responseRatio * 100) / 100, justification: `Proporcional a respuestas recibidas (${data.responses.length})` },
    ],
    overallScore: avgConfidence,
    feedback: `Evaluación fallback: ${data.responses.length} agentes respondieron con confianza promedio de ${(avgConfidence * 100).toFixed(0)}%. ${enthusiasticCount > 0 ? `${enthusiasticCount} agentes mostraron entusiasmo.` : 'Ningún agente mostró entusiasmo.'}`,
    improvements: [
      'Considerar usar prompts más específicos para mejorar relevancia',
      'Aumentar diversidad de divisiones para mayor creatividad',
      'Revisar personalidades de agentes con baja confianza',
    ],
    highlights: {
      best: data.responses.filter(r => r.confidence >= 0.7).map(r => r.agentName).slice(0, 3),
      worst: data.responses.filter(r => r.confidence < 0.4).map(r => r.agentName).slice(0, 2),
    },
    tokensUsed,
    evaluatedAt: new Date().toISOString(),
  }
}

// ===== TRUST ADJUSTMENT FROM JUDGE =====

/**
 * Calculate trust delta for each agent based on judge evaluation.
 * Agents highlighted as "best" get +0.05, "worst" get -0.03.
 * Overall score below 0.5 gives all agents a small penalty.
 */
export function calculateTrustFromJudge(
  result: JudgeResult,
  responseAgents: Array<{ agentId: string; agentName: string }>,
): Array<{ agentId: string; delta: number; reason: string }> {
  const adjustments: Array<{ agentId: string; delta: number; reason: string }> = []

  for (const agent of responseAgents) {
    let delta = 0
    let reason = ''

    // Check if agent was highlighted as best
    if (result.highlights.best.includes(agent.agentName)) {
      delta += 0.05
      reason = 'Destacado por el juez como mejor performer'
    }

    // Check if agent was highlighted as worst
    if (result.highlights.worst.includes(agent.agentName)) {
      delta -= 0.03
      reason = 'Identificado por el juez como underperformer'
    }

    // Overall wave quality bonus/penalty
    if (result.overallScore >= 0.8) {
      delta += 0.02
      if (!reason) reason = 'Oleada de alta calidad (score >= 0.8)'
    } else if (result.overallScore < 0.4) {
      delta -= 0.02
      if (!reason) reason = 'Oleada de baja calidad (score < 0.4)'
    }

    // Only add meaningful adjustments
    if (Math.abs(delta) > 0.001) {
      adjustments.push({ agentId: agent.agentId, delta, reason })
    }
  }

  return adjustments
}

// ===== SCORE LABELS =====

export function getScoreLabel(score: number): { label: string; color: string } {
  if (score >= 0.85) return { label: 'Excelente', color: 'text-emerald-400' }
  if (score >= 0.7) return { label: 'Bueno', color: 'text-green-400' }
  if (score >= 0.55) return { label: 'Aceptable', color: 'text-amber-400' }
  if (score >= 0.4) return { label: 'Bajo', color: 'text-orange-400' }
  return { label: 'Crítico', color: 'text-red-400' }
}

export function getDimensionEmoji(name: string): string {
  const map: Record<string, string> = {
    RELEVANCIA: '🎯',
    PROFUNDIDAD: '🔬',
    CREATIVIDAD: '💡',
    COHERENCIA: '🔗',
    ACCIONABILIDAD: '⚡',
  }
  return map[name] || '📊'
}
