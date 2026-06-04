/**
 * Agent Self-Improvement (Auto-Mejora) System
 * Inspired by Hermes Agent (Nous Research) — agents learn and evolve from experiences.
 * Extracts reusable skills from high-quality agent responses and injects them into future prompts.
 */

import { db } from '@/lib/db'
import ZAI from 'z-ai-web-dev-sdk'

interface SkillData {
  name: string
  description: string
}

interface ResponseForExtraction {
  agentId: string // ProjectAgent.id
  content: string
  confidence: number
  mood: string
  projectAgent: {
    agentId: string // Agent.id
    agent: {
      id: string // Agent.id
      name: string
    }
  }
}

/**
 * Extract potential skills from high-quality responses in a completed wave.
 * Only processes responses with confidence >= 0.8 AND mood === 'enthusiastic'.
 * Uses LLM to identify 1-2 reusable skills/insights per response.
 */
export async function extractSkillsFromWave(waveId: string, projectId: string): Promise<number> {
  // Find high-quality responses: confidence >= 0.8 AND mood === 'enthusiastic'
  const responses = await db.response.findMany({
    where: {
      waveId,
      confidence: { gte: 0.8 },
      mood: 'enthusiastic',
    },
    include: {
      projectAgent: {
        include: { agent: { select: { id: true, name: true } } },
      },
    },
  })

  if (responses.length === 0) return 0

  let totalSkillsCreated = 0

  for (const response of responses) {
    try {
      const agentId = response.projectAgent.agentId // Agent.id
      const agentName = response.projectAgent.agent.name

      // Skip if agent already has many skills (cap at 15 per agent per project)
      const existingCount = await db.agentSkill.count({
        where: { projectId, agentId },
      })
      if (existingCount >= 15) continue

      // Use LLM to extract skills from response content
      const skills = await extractSkillsWithLLM(response.content, agentName)

      for (const skill of skills) {
        try {
          // Upsert: if skill with same name already exists for this agent+project, skip
          await db.agentSkill.upsert({
            where: {
              projectId_agentId_name: {
                projectId,
                agentId,
                name: skill.name,
              },
            },
            create: {
              projectId,
              agentId,
              name: skill.name,
              description: skill.description,
              sourceWaveId: waveId,
              quality: 0.6, // New skills start with moderate quality
              timesUsed: 0,
            },
            update: {
              // If it already exists, bump quality slightly
              quality: { increment: 0.05 },
              updatedAt: new Date(),
            },
          })
          totalSkillsCreated++
        } catch {
          // Skip duplicate or invalid skill
        }
      }
    } catch (error) {
      console.error(`Error extracting skills for agent ${response.projectAgent.agent.name}:`, error)
    }
  }

  return totalSkillsCreated
}

/**
 * Uses LLM to extract 1-2 reusable skills from a high-quality response.
 */
async function extractSkillsWithLLM(content: string, agentName: string): Promise<SkillData[]> {
  try {
    const zai = await ZAI.create()
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `Eres un analista de habilidades de IA. Tu tarea es extraer 1-2 habilidades reutilizables e insight clave de una respuesta de alta calidad de un agente llamado "${agentName}".

REGLAS:
- Las habilidades deben ser genéricas y reaprovechables (no específicas de un solo problema)
- Cada habilidad debe tener un nombre corto (3-6 palabras) y una descripción concisa (1 frase)
- Responde SOLO en formato JSON válido, sin texto adicional
- Si no hay habilidades claras, devuelve un array vacío

FORMATO EXACTO:
[{"name": "Nombre de Habilidad", "description": "Descripción breve de lo que aprendió"}]`,
        },
        {
          role: 'user',
          content: `Respuesta del agente "${agentName}":\n\n${content.slice(0, 800)}`,
        },
      ],
      thinking: { type: 'disabled' },
      temperature: 0.3,
    })

    const raw = completion.choices?.[0]?.message?.content || '[]'
    // Extract JSON from response (might be wrapped in markdown code blocks)
    const jsonMatch = raw.match(/\[[\s\S]*?\]/)
    if (!jsonMatch) return []

    const skills = JSON.parse(jsonMatch[0]) as SkillData[]

    // Validate and clean
    return skills
      .filter((s) => s.name && s.description && s.name.length <= 60 && s.description.length <= 200)
      .slice(0, 2)
  } catch (error) {
    console.error('LLM skill extraction failed:', error)
    return []
  }
}

/**
 * Fetches an agent's skills from the database.
 */
export async function getAgentSkills(projectId: string, agentId: string) {
  return db.agentSkill.findMany({
    where: { projectId, agentId },
    orderBy: [{ quality: 'desc' }, { timesUsed: 'desc' }],
  })
}

/**
 * Increments the timesUsed counter for agent skills (called when skills are injected into a prompt).
 */
export async function markSkillsAsUsed(skillIds: string[]) {
  if (skillIds.length === 0) return
  await db.agentSkill.updateMany({
    where: { id: { in: skillIds } },
    data: { timesUsed: { increment: 1 } },
  })
}

/**
 * Boosts quality of skills that were used in a high-quality response.
 */
export async function boostSkillQuality(
  projectId: string,
  agentId: string,
  confidence: number,
  mood: string,
) {
  // Only boost if the response was good
  if (confidence < 0.7 || mood === 'concerned') return

  const skills = await db.agentSkill.findMany({
    where: { projectId, agentId },
    select: { id: true },
  })

  if (skills.length === 0) return

  const boostAmount = mood === 'enthusiastic' && confidence >= 0.8 ? 0.05 : 0.02

  await db.agentSkill.updateMany({
    where: { id: { in: skills.map((s) => s.id) } },
    data: {
      quality: { increment: boostAmount },
    },
  })
}

/**
 * Formats agent skills as context string for LLM prompts.
 */
export function formatAgentSkills(skills: Array<{ name: string; description: string; quality: number }>): string {
  if (skills.length === 0) return ''

  const header = '## Habilidades Previas del Agente (Auto-Mejora)\nEstas son habilidades que este agente ha desarrollado a partir de experiencias anteriores. Utilízalas para enriquecer tu respuesta:'

  const items = skills.map((s) => {
    return `- ✨ **${s.name}** (calidad ${Math.round(s.quality * 100)}%): ${s.description}`
  })

  return `${header}\n${items.join('\n')}`
}
