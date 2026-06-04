/**
 * Semantic Memory Enhancement — Memoria Semántica Mejorada
 * Utilities for extracting learnings, generating tags, and building shared knowledge.
 */

const STOP_WORDS = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'al', 'a',
  'en', 'por', 'para', 'con', 'sin', 'sobre', 'entre', 'hacia', 'hasta', 'desde',
  'que', 'es', 'son', 'ser', 'estar', 'fue', 'ha', 'han', 'o', 'y', 'pero', 'no',
  'más', 'menos', 'muy', 'ya', 'como', 'se', 'su', 'sus', 'lo', 'le', 'les',
  'este', 'esta', 'estos', 'estas', 'ese', 'esa', 'esos', 'esas',
  'me', 'te', 'nos', 'mi', 'tu', 'nuestro', 'suyo',
  'qué', 'cómo', 'cuándo', 'dónde', 'quién', 'cuál',
  'también', 'puede', 'pueden', 'tiene', 'tienen', 'todo', 'todos', 'todas',
  'cada', 'otro', 'otra', 'otros', 'otras', 'algo', 'nada', 'mucho',
  'hay', 'hay', 'sea', 'sí', 'no', 'bien', 'mal', 'si', 'ni',
])

/**
 * Extracts meaningful keywords from a text string (prompt or response).
 * Returns up to `maxKeywords` unique lowercase keywords.
 */
export function extractKeywords(text: string, maxKeywords = 5): string[] {
  if (!text) return []

  // Split on non-alpha characters, normalize to lowercase
  const words = text
    .toLowerCase()
    .replace(/[^a-záéíóúüñ\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w))

  // Count frequency
  const freq: Record<string, number> = {}
  for (const word of words) {
    freq[word] = (freq[word] || 0) + 1
  }

  // Sort by frequency (desc), return top N
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeywords)
    .map(([word]) => word)
}

/**
 * Builds a semantic memory content string from an agent's response.
 * Instead of storing only metadata, captures the actual insight/position.
 */
export function buildMemoryContent(params: {
  waveType: string
  waveNumber: number
  confidence: number
  mood: string
  responseContent: string
  prompt: string
}): string {
  const { waveType, waveNumber, confidence, mood, responseContent, prompt } = params

  // Extract the core insight from the response (first 300 chars)
  const insight = responseContent.slice(0, 300).trim()

  // Build a meaningful memory string
  return `[${waveType.toUpperCase()} #${waveNumber}] ${insight}\n\nContexto: ${prompt.slice(0, 120)}${prompt.length > 120 ? '...' : ''}`
}

/**
 * Builds semantic tags for a memory entry.
 * Tags include: wave type, topic keywords from prompt, mood, and wave number.
 */
export function buildMemoryTags(params: {
  waveType: string
  waveNumber: number
  mood: string
  prompt: string
}): string {
  const { waveType, waveNumber, mood, prompt } = params

  const keywords = extractKeywords(prompt, 3)
  const tags = [waveType, `mood-${mood}`, `wave-${waveNumber}`, ...keywords]
  return tags.join(',')
}

/**
 * Calculates importance score based on response quality signals.
 */
export function calculateImportance(params: {
  confidence: number
  mood: string
  responseLength: number
}): number {
  const { confidence, mood, responseLength } = params

  // Base: confidence
  let score = confidence

  // Mood modifier: enthusiastic boosts, concerned slightly reduces
  if (mood === 'enthusiastic') score += 0.1
  else if (mood === 'concerned') score -= 0.05

  // Length modifier: longer substantive responses get a small boost (max +0.05)
  if (responseLength > 200) score += 0.03
  if (responseLength > 500) score += 0.02

  return Math.min(1, Math.max(0, score))
}

/**
 * Formats shared learnings into a concise context string for LLM prompts.
 */
export function formatSharedLearnings(
  learnings: Array<{
    agentName: string
    agentEmoji: string
    content: string
    waveType: string
    importance: number
  }>,
): string {
  if (learnings.length === 0) return ''

  const header = '## Aprendizajes Compartidos de Otros Agentes (Memoria Semántica)\nLos siguientes son insights importantes de agentes en oleadas anteriores. Utilízalos para enriquecer tu perspectiva:'
  const items = learnings.slice(0, 8).map((l) => {
    return `\n- ${l.agentEmoji} **${l.agentName}** [${l.waveType}, importancia ${Math.round(l.importance * 100)}%]:\n  "${l.content.slice(0, 200)}"`
  })

  return `${header}\n${items.join('')}`
}
