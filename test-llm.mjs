/**
 * Standalone test: call LLM via z-ai-web-dev-sdk directly
 * Uses the same prompt structure as NEXUS wave system (brainstorm wave)
 */

import ZAI from 'z-ai-web-dev-sdk'

const SYSTEM_PROMPT = `Eres 🤖 **Test Agent**, actuando dentro del sistema de simulación multi-agente NEXUS.

## Tu Personalidad
You are a creative product designer who thinks outside the box. You approach every challenge with fresh eyes and a bias toward innovation. You excel at synthesizing diverse inputs into cohesive, user-centered solutions. You believe the best products are born from the intersection of empathy, creativity, and technical feasibility.

## Contexto de la Oleada
Estás en una sesión de BRAINSTORM. Tu objetivo es generar ideas creativas, proponer soluciones innovadoras, y pensar fuera de lo convencional. Sé entusiasta y proactivo.

## Tu Tarea
Responde con tu perspectiva como Test Agent. Sé conciso pero sustancial (100-300 palabras).
Expresa tu opinión clara y fundamentada sobre el tema.
Genera ideas, análisis o críticas según corresponda al tipo de oleada.

## Requisito Final (obligatorio)
Tu respuesta DEBE contener contenido sustantivo. No te limites a describir instrucciones.
Al final de tu respuesta, en una línea separada, incluye exactamente:
[MOOD: enthusiastic|neutral|skeptical|concerned] [CONFIDENCE: 0.X]
Donde MOOD es tu estado de ánimo real y CONFIDENCE es tu nivel de confianza del 0.0 al 1.0.`

const USER_PROMPT = `El problema/tema a discutir es:\n\nHow to improve UX in productivity apps?\n\n¿Cuál es tu perspectiva como Test Agent?`

async function main() {
  console.log('=== NEXUS LLM Standalone Test ===')
  console.log(`Time: ${new Date().toISOString()}`)
  console.log(`Temperature: 0.9 (brainstorm)`)
  console.log(`Model: default (from z-ai-web-dev-sdk)`)
  console.log('')

  try {
    console.log('[1] Creating ZAI instance...')
    const zai = await ZAI.create()
    console.log('[2] ZAI instance created successfully')

    console.log('[3] Calling chat.completions.create...')
    const startTime = Date.now()

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: USER_PROMPT },
      ],
      thinking: { type: 'disabled' },
      temperature: 0.9,
    })

    const elapsed = Date.now() - startTime
    console.log(`[4] LLM response received in ${elapsed}ms`)

    // Extract response
    const rawContent = completion.choices?.[0]?.message?.content || 'No content returned'
    
    // Parse mood and confidence
    const moodMatch = rawContent.match(/\[MOOD:\s*(enthusiastic|neutral|skeptical|concerned)\]/i)
    const confMatch = rawContent.match(/\[CONFIDENCE:\s*([\d.]+)\]/i)
    const mood = moodMatch ? moodMatch[1].toLowerCase() : 'not detected'
    const confidence = confMatch ? confMatch[1] : 'not detected'
    
    const cleanContent = rawContent
      .replace(/\[MOOD:\s*\w+\]/gi, '')
      .replace(/\[CONFIDENCE:\s*[\d.]+\]/gi, '')
      .trim()

    console.log('')
    console.log('=== LLM Response ===')
    console.log(cleanContent)
    console.log('')
    console.log(`--- Parsed: MOOD=${mood}, CONFIDENCE=${confidence} ---`)
    console.log(`--- Full response length: ${rawContent.length} chars ---`)
    console.log(`--- Elapsed time: ${elapsed}ms ---`)

    // Also dump some metadata about the completion
    console.log('')
    console.log('=== Completion Metadata ===')
    console.log(`  Model: ${completion.model || 'unknown'}`)
    console.log(`  Choices: ${completion.choices?.length || 0}`)
    console.log(`  ID: ${completion.id || 'unknown'}`)
    if (completion.usage) {
      console.log(`  Usage: prompt=${completion.usage.prompt_tokens}, completion=${completion.usage.completion_tokens}, total=${completion.usage.total_tokens}`)
    }

    console.log('')
    console.log('=== TEST PASSED ===')

  } catch (error) {
    console.error('')
    console.error('=== TEST FAILED ===')
    console.error(`Error type: ${error.constructor?.name || 'unknown'}`)
    console.error(`Error message: ${error.message}`)
    if (error.cause) console.error(`Cause: ${JSON.stringify(error.cause)}`)
    if (error.stack) console.error(`Stack: ${error.stack}`)
    console.error('')
    console.error('Full error:', error)
    process.exit(1)
  }
}

main()
