import ZAI from 'z-ai-web-dev-sdk'

export const WAVE_TEMPERATURES: Record<string, number> = {
  brainstorm: 0.9,
  critique: 0.3,
  synthesize: 0.5,
  execute: 0.4,
  quality_gate: 0.2,
}

export const WAVE_CONTEXT: Record<string, string> = {
  brainstorm: 'Estás en una sesión de BRAINSTORM. Tu objetivo es generar ideas creativas, proponer soluciones innovadoras, y pensar fuera de lo convencional. Sé entusiasta y proactivo.',
  critique: 'Estás en una sesión de CRÍTICA. Tu objetivo es identificar problemas, evaluar riesgos, señalar debilidades, y cuestionar suposiciones. Sé honesto y constructivo.',
  synthesize: 'Estás en una sesión de SÍNTESIS. Tu objetivo es integrar las perspectivas de múltiples agentes, encontrar patrones comunes, y generar conclusiones unificadas. Sé analítico y equilibrado.',
  execute: 'Estás en una sesión de EJECUCIÓN. Tu objetivo es proporcionar pasos concretos de implementación, definir planes de acción, y detallar cómo ejecutar las decisiones. Sé práctico y directo.',
  quality_gate: 'Estás en un CONTROL DE CALIDAD. Tu objetivo es verificar rigurosamente los resultados, encontrar defectos, y solo aprobar si hay evidencia contundente. Sé escéptico por defecto.',
}

export function parseMoodAndConfidence(content: string): { content: string; confidence: number; mood: string } {
  let mood = 'neutral'
  let confidence = 0.5
  const moodMatch = content.match(/\[MOOD:\s*(enthusiastic|neutral|skeptical|concerned)\]/i)
  const confMatch = content.match(/\[CONFIDENCE:\s*([\d.]+)\]/i)
  if (moodMatch) mood = moodMatch[1].toLowerCase()
  if (confMatch) confidence = Math.min(1, Math.max(0, parseFloat(confMatch[1])))
  const cleanContent = content.replace(/\[MOOD:\s*\w+\]/gi, '').replace(/\[CONFIDENCE:\s*[\d.]+\]/gi, '').trim()
  return { content: cleanContent, confidence, mood }
}

export async function callLLM(data: {
  agentName: string; agentPersonality: string; waveType: string;
  prompt: string; memories?: string[]; previousResponses?: string[];
  sharedLearnings?: string;
  agentSkills?: string;
  mem0Context?: string;
  agentEmoji?: string; agentVibe?: string;
}): Promise<{ content: string; confidence: number; mood: string }> {
  const zai = await ZAI.create()
  const { agentName, agentPersonality, waveType, prompt, memories = [], previousResponses = [], sharedLearnings = '', agentSkills = '', mem0Context = '' } = data
  const agentEmoji = data.agentEmoji || '🤖'
  const agentVibe = data.agentVibe || ''

  const parts = [
    `Eres ${agentEmoji} **${agentName}**, actuando dentro del sistema de simulación multi-agente NEXUS.`,
    '', `## Tu Personalidad`, agentPersonality.slice(0, 1500), '',
  ]
  if (agentVibe) parts.push(`## Tu Vibra`, agentVibe, '')
  parts.push(`## Contexto de la Oleada`, WAVE_CONTEXT[waveType] || '')
  if (memories.length > 0) { parts.push('', '## Tus Memorias y Aprendizajes Previos', memories.join('\n')) }
  if (previousResponses.length > 0) { parts.push('', '## Respuestas Previas de Otros Agentes', previousResponses.join('\n')) }
  if (sharedLearnings) { parts.push('', sharedLearnings) }
  if (agentSkills) { parts.push('', agentSkills) }
  if (mem0Context) { parts.push('', mem0Context) }
  parts.push(
    '', '## Tu Tarea',
    `Responde con tu perspectiva como ${agentName}. Sé conciso pero sustancial (100-300 palabras).`,
    'Expresa tu opinión clara y fundamentada sobre el tema.',
    'Genera ideas, análisis o críticas según corresponda al tipo de oleada.',
    '',
    '## Requisito Final (obligatorio)',
    'Tu respuesta DEBE contener contenido sustantivo. No te limites a describir instrucciones.',
    'Al final de tu respuesta, en una línea separada, incluye exactamente:',
    '[MOOD: enthusiastic|neutral|skeptical|concerned] [CONFIDENCE: 0.X]',
    'Donde MOOD es tu estado de ánimo real y CONFIDENCE es tu nivel de confianza del 0.0 al 1.0.',
  )

  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'system', content: parts.join('\n') },
      { role: 'user', content: `El problema/tema a discutir es:\n\n${prompt}\n\n¿Cuál es tu perspectiva como ${agentName}?` },
    ],
    thinking: { type: 'disabled' },
    temperature: WAVE_TEMPERATURES[waveType] ?? 0.7,
  })

  const rawContent = completion.choices?.[0]?.message?.content || 'No se pudo generar una respuesta.'
  return parseMoodAndConfidence(rawContent)
}

export const DIVISION_MAP: Record<string, string[]> = {
  brainstorm: ['product', 'marketing', 'design', 'engineering', 'specialized', 'testing', 'sales', 'project-management', 'support', 'finance', 'paid-media'],
  critique: ['testing', 'specialized', 'engineering', 'product', 'project-management'],
  synthesize: ['specialized', 'project-management', 'product', 'engineering', 'design'],
  execute: ['engineering', 'design', 'product'],
  quality_gate: ['testing', 'specialized', 'engineering'],
}

export const VALID_WAVE_TYPES = ['brainstorm', 'critique', 'synthesize', 'execute', 'quality_gate']
