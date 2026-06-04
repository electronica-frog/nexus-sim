import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

const WAVE_TEMPERATURES: Record<string, number> = {
  brainstorm: 0.9,
  critique: 0.3,
  synthesize: 0.5,
  execute: 0.4,
  quality_gate: 0.2,
}

const WAVE_CONTEXT: Record<string, string> = {
  brainstorm:
    'Estás en una sesión de BRAINSTORM. Tu objetivo es generar ideas creativas, proponer soluciones innovadoras, y pensar fuera de lo convencional. Sé entusiasta y proactivo.',
  critique:
    'Estás en una sesión de CRÍTICA. Tu objetivo es identificar problemas, evaluar riesgos, señalar debilidades, y cuestionar suposiciones. Sé honesto y constructivo.',
  synthesize:
    'Estás en una sesión de SÍNTESIS. Tu objetivo es integrar las perspectivas de múltiples agentes, encontrar patrones comunes, y generar conclusiones unificadas. Sé analítico y equilibrado.',
  execute:
    'Estás en una sesión de EJECUCIÓN. Tu objetivo es proporcionar pasos concretos de implementación, definir planes de acción, y detallar cómo ejecutar las decisiones. Sé práctico y directo.',
  quality_gate:
    'Estás en un CONTROL DE CALIDAD. Tu objetivo es verificar rigurosamente los resultados, encontrar defectos, y solo aprobar si hay evidencia contundente. Sé escéptico por defecto.',
}

function buildSystemPrompt(data: {
  agentName: string
  agentPersonality: string
  waveType: string
  agentEmoji?: string
  agentVibe?: string
  memories: string[]
  previousResponses: string[]
}): string {
  const { agentName, agentPersonality, waveType, memories, previousResponses } = data
  const agentEmoji = data.agentEmoji || '🤖'
  const agentVibe = data.agentVibe || ''

  const parts = [
    `Eres ${agentEmoji} **${agentName}**, actuando dentro del sistema de simulación multi-agente NEXUS.`,
    '',
    `## Tu Personalidad`,
    agentPersonality.slice(0, 1500),
    '',
  ]

  if (agentVibe) {
    parts.push(`## Tu Vibra`, agentVibe, '')
  }

  parts.push(`## Contexto de la Oleada`, WAVE_CONTEXT[waveType] || '')

  if (memories.length > 0) {
    parts.push('', '## Tus Memorias y Aprendizajes Previos')
    parts.push(memories.join('\n'))
  }

  if (previousResponses.length > 0) {
    parts.push('', '## Respuestas Previas de Otros Agentes')
    parts.push(previousResponses.join('\n'))
  }

  parts.push(
    '',
    '## Instrucciones de Formato',
    'Responde con tu perspectiva como ' +
      agentName +
      '. Sé conciso pero sustancial (100-300 palabras).',
    'Expresa tu opinión clara sobre el tema.',
    '',
    'AL FINAL de tu respuesta, incluye una línea con el formato exacto:',
    '[MOOD: enthusiastic|neutral|skeptical|concerned] [CONFIDENCE: 0.X]',
    'Ejemplo: [MOOD: skeptical] [CONFIDENCE: 0.7]',
  )

  return parts.join('\n')
}

function parseMoodAndConfidence(content: string): {
  content: string
  confidence: number
  mood: string
} {
  let mood = 'neutral'
  let confidence = 0.5

  const moodMatch = content.match(
    /\[MOOD:\s*(enthusiastic|neutral|skeptical|concerned)\]/i,
  )
  const confMatch = content.match(/\[CONFIDENCE:\s*([\d.]+)\]/i)

  if (moodMatch) mood = moodMatch[1].toLowerCase()
  if (confMatch) confidence = Math.min(1, Math.max(0, parseFloat(confMatch[1])))

  // Clean the metadata tags from content
  let cleanContent = content
    .replace(/\[MOOD:\s*\w+\]/gi, '')
    .replace(/\[CONFIDENCE:\s*[\d.]+\]/gi, '')
    .trim()

  return { content: cleanContent, confidence, mood }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      agentName,
      agentPersonality,
      waveType,
      prompt,
      memories = [],
      previousResponses = [],
      agentEmoji,
      agentVibe,
    } = body

    if (!agentName || !prompt) {
      return NextResponse.json(
        { error: 'Se requieren agentName y prompt' },
        { status: 400 },
      )
    }

    const zai = await ZAI.create()

    const systemPrompt = buildSystemPrompt({
      agentName,
      agentPersonality: agentPersonality || '',
      waveType: waveType || 'brainstorm',
      memories,
      previousResponses,
      agentEmoji,
      agentVibe,
    })

    const userMessage = `El problema/tema a discutir es:\n\n${prompt}\n\n¿Cuál es tu perspectiva como ${agentName}?`

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      thinking: { type: 'disabled' },
      temperature: WAVE_TEMPERATURES[waveType] ?? 0.7,
    })

    const rawContent =
      completion.choices?.[0]?.message?.content ||
      'No se pudo generar una respuesta.'

    const parsed = parseMoodAndConfidence(rawContent)

    return NextResponse.json({
      content: parsed.content,
      confidence: parsed.confidence,
      mood: parsed.mood,
      rawContent,
    })
  } catch (error) {
    console.error('LLM Error:', error)
    return NextResponse.json(
      {
        error: 'Error en la generación LLM',
        content: `Error al generar respuesta del agente: ${String(error)}`,
        confidence: 0,
        mood: 'concerned',
      },
      { status: 500 },
    )
  }
}
