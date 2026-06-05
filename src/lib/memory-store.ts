/**
 * Mem0 — Long-term Memory Store for NEXUS Sim v2
 *
 * Implements Mem0-style memory management:
 * - Exponential decay: memories fade over time unless reinforced
 * - Relevance scoring: combines decay score + access frequency + recency
 * - Consolidation: merge similar memories to reduce noise
 * - Context enrichment: retrieve top-K relevant memories for agent context
 *
 * Score formula:
 *   relevance = baseScore × decay(now) × accessBoost × recencyBoost
 *   decay(now) = e^(-decayRate × hoursSinceCreation)
 *   accessBoost = 1 + log(1 + accessCount)
 *   recencyBoost = 1 + 0.5 × (1 / (1 + hoursSinceLastAccess))
 */
import { db } from '@/lib/db'

// ===== TYPES =====

export interface MemoryWithRelevance {
  id: string
  projectId: string
  agentId: string
  content: string
  category: string
  tags: string
  baseScore: number
  accessCount: number
  lastAccessedAt: Date | null
  decayRate: number
  sourceWaveId: string | null
  sourceType: string
  relevance: number
  createdAt: Date
}

export interface MemoryAddInput {
  projectId: string
  agentId: string
  content: string
  category?: string
  tags?: string
  baseScore?: number
  decayRate?: number
  sourceWaveId?: string
  sourceType?: string
}

// ===== RELEVANCE SCORING =====

const HOURS_PER_MS = 1 / (1000 * 60 * 60)

/**
 * Compute Mem0 relevance score for a memory at a given time.
 */
export function computeRelevance(memory: {
  baseScore: number
  accessCount: number
  lastAccessedAt: Date | null
  decayRate: number
  createdAt: Date
}, now: Date = new Date()): number {
  const hoursSinceCreation = (now.getTime() - memory.createdAt.getTime()) * HOURS_PER_MS
  const hoursSinceLastAccess = memory.lastAccessedAt
    ? (now.getTime() - memory.lastAccessedAt.getTime()) * HOURS_PER_MS
    : Infinity

  // Exponential decay from creation time
  const decay = Math.exp(-memory.decayRate * hoursSinceCreation)

  // Access frequency boost (logarithmic — diminishing returns)
  const accessBoost = 1 + Math.log(1 + memory.accessCount)

  // Recency boost (recently accessed memories are more relevant)
  const recencyBoost = 1 + 0.5 / (1 + hoursSinceLastAccess)

  return memory.baseScore * decay * accessBoost * recencyBoost
}

/**
 * Batch compute relevance for an array of memories, sort descending.
 */
export function scoreAndRank(
  memories: Array<{
    id: string; projectId: string; agentId: string; content: string;
    category: string; tags: string; baseScore: number; accessCount: number;
    lastAccessedAt: Date | null; decayRate: number; sourceWaveId: string | null;
    sourceType: string; createdAt: Date;
  }>,
  now: Date = new Date()
): MemoryWithRelevance[] {
  const scored: MemoryWithRelevance[] = memories.map((m) => ({
    ...m,
    relevance: computeRelevance(m, now),
  }))
  scored.sort((a, b) => b.relevance - a.relevance)
  return scored
}

// ===== CRUD OPERATIONS =====

/**
 * Add a new memory to the store.
 */
export async function addMemory(input: MemoryAddInput) {
  return db.memoryStore.create({
    data: {
      projectId: input.projectId,
      agentId: input.agentId,
      content: input.content,
      category: input.category || 'general',
      tags: input.tags || '',
      baseScore: input.baseScore ?? 1.0,
      decayRate: input.decayRate ?? 0.05,
      sourceWaveId: input.sourceWaveId || null,
      sourceType: input.sourceType || 'wave',
    },
  })
}

/**
 * Add multiple memories in a batch (e.g. after a wave).
 */
export async function addMemories(inputs: MemoryAddInput[]) {
  const results = []
  for (const input of inputs) {
    results.push(await addMemory(input))
  }
  return results
}

/**
 * Retrieve top-K relevant memories for an agent (with relevance scoring).
 */
export async function getRelevantMemories(
  projectId: string,
  agentId: string,
  limit: number = 10,
  category?: string
): Promise<MemoryWithRelevance[]> {
  const where: Record<string, unknown> = {
    projectId,
    agentId,
  }
  if (category && category !== 'all') {
    where.category = category
  }

  const memories = await db.memoryStore.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 200, // Fetch up to 200, then score and rank
  })

  const scored = scoreAndRank(memories)
  return scored.slice(0, limit)
}

/**
 * Retrieve top-K relevant memories across ALL agents for a project (shared context).
 */
export async function getProjectMemories(
  projectId: string,
  limit: number = 20,
  category?: string
): Promise<MemoryWithRelevance[]> {
  const where: Record<string, unknown> = { projectId }
  if (category && category !== 'all') {
    where.category = category
  }

  const memories = await db.memoryStore.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  const scored = scoreAndRank(memories)
  return scored.slice(0, limit)
}

/**
 * Record that a memory was accessed (boosts its relevance).
 */
export async function touchMemory(memoryId: string) {
  return db.memoryStore.update({
    where: { id: memoryId },
    data: {
      accessCount: { increment: 1 },
      lastAccessedAt: new Date(),
    },
  })
}

/**
 * Batch touch multiple memories (e.g., after context enrichment).
 */
export async function touchMemories(memoryIds: string[]) {
  if (memoryIds.length === 0) return
  await db.memoryStore.updateMany({
    where: { id: { in: memoryIds } },
    data: {
      accessCount: { increment: 1 },
      lastAccessedAt: new Date(),
    },
  })
}

/**
 * Update a memory's content or metadata.
 */
export async function updateMemory(
  memoryId: string,
  data: { content?: string; category?: string; tags?: string; baseScore?: number; decayRate?: number }
) {
  return db.memoryStore.update({
    where: { id: memoryId },
    data,
  })
}

/**
 * Delete a memory.
 */
export async function deleteMemory(memoryId: string) {
  return db.memoryStore.delete({ where: { id: memoryId } })
}

// ===== CONSOLIDATION =====

/**
 * Find and merge duplicate/similar memories for an agent.
 * Uses simple text similarity (shared tags + content overlap) as a heuristic.
 * Returns the list of merges performed.
 */
export async function consolidateMemories(
  projectId: string,
  agentId: string,
  similarityThreshold: number = 0.7
) {
  const memories = await db.memoryStore.findMany({
    where: { projectId, agentId },
    orderBy: { createdAt: 'desc' },
  })

  if (memories.length < 2) return { merged: 0, memories: [] }

  const merges: Array<{ kept: typeof memories[0]; absorbed: typeof memories[0] }> = []
  const consumed = new Set<string>()

  for (let i = 0; i < memories.length; i++) {
    if (consumed.has(memories[i].id)) continue

    for (let j = i + 1; j < memories.length; j++) {
      if (consumed.has(memories[j].id)) continue

      const sim = computeSimpleSimilarity(memories[i].content, memories[j].content, memories[i].tags, memories[j].tags)
      if (sim >= similarityThreshold) {
        // Merge j into i (keep the more recent one)
        const kept = memories[i]
        const absorbed = memories[j]

        // Update the kept memory with merged content
        await db.memoryStore.update({
          where: { id: kept.id },
          data: {
            content: `${kept.content}\n[Consolidado] ${absorbed.content.slice(0, 200)}`,
            baseScore: Math.min(2, Math.max(kept.baseScore, absorbed.baseScore) * 1.1),
            accessCount: kept.accessCount + absorbed.accessCount,
            mergedFromIds: JSON.stringify([
              ...(kept.mergedFromIds ? JSON.parse(kept.mergedFromIds) : []),
              absorbed.id,
            ]),
          },
        })

        // Delete absorbed memory
        await db.memoryStore.delete({ where: { id: absorbed.id } })
        consumed.add(absorbed.id)
        merges.push({ kept, absorbed })
      }
    }
  }

  return { merged: merges.length, memories: merges }
}

/**
 * Simple text similarity heuristic using shared tags and word overlap.
 */
function computeSimpleSimilarity(
  content1: string,
  content2: string,
  tags1: string,
  tags2: string
): number {
  // Tag overlap (40% weight)
  const tagSet1 = new Set(tags1.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean))
  const tagSet2 = new Set(tags2.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean))
  const tagIntersection = [...tagSet1].filter((t) => tagSet2.has(t))
  const tagSimilarity = tagSet1.size + tagSet2.size > 0
    ? (2 * tagIntersection.length) / (tagSet1.size + tagSet2.size)
    : 0

  // Word overlap (60% weight)
  const words1 = new Set(content1.toLowerCase().split(/\s+/).filter((w) => w.length > 3))
  const words2 = new Set(content2.toLowerCase().split(/\s+/).filter((w) => w.length > 3))
  const wordIntersection = [...words1].filter((w) => words2.has(w))
  const wordSimilarity = words1.size + words2.size > 0
    ? (2 * wordIntersection.length) / (words1.size + words2.size)
    : 0

  return 0.4 * tagSimilarity + 0.6 * wordSimilarity
}

// ===== DECAY MAINTENANCE =====

/**
 * Get memories that have decayed below a threshold (candidates for cleanup/archival).
 */
export async function getDecayedMemories(
  projectId: string,
  threshold: number = 0.1,
  maxAgeHours: number = 168 // 7 days
): Promise<MemoryWithRelevance[]> {
  const memories = await db.memoryStore.findMany({
    where: { projectId },
    orderBy: { createdAt: 'asc' }, // oldest first
  })

  const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000)

  return memories
    .map((m) => ({ ...m, relevance: computeRelevance(m) }))
    .filter((m) => m.relevance < threshold && m.createdAt < cutoff)
}

/**
 * Delete all memories below decay threshold (garbage collection).
 */
export async function garbageCollectMemories(
  projectId: string,
  threshold: number = 0.1,
  maxAgeHours: number = 168
): Promise<number> {
  const decayed = await getDecayedMemories(projectId, threshold, maxAgeHours)
  if (decayed.length === 0) return 0

  const ids = decayed.map((m) => m.id)
  await db.memoryStore.deleteMany({ where: { id: { in: ids } } })
  return ids.length
}

/**
 * Get statistics about the memory store for a project.
 */
export async function getMemoryStats(projectId: string) {
  const total = await db.memoryStore.count({ where: { projectId } })
  const byCategory = await db.memoryStore.groupBy({
    by: ['category'],
    where: { projectId },
    _count: true,
  })
  const byAgent = await db.memoryStore.groupBy({
    by: ['agentId'],
    where: { projectId },
    _count: true,
  })

  // Compute average relevance
  const allMemories = await db.memoryStore.findMany({ where: { projectId } })
  const scored = scoreAndRank(allMemories)
  const avgRelevance = scored.length > 0
    ? scored.reduce((sum, m) => sum + m.relevance, 0) / scored.length
    : 0
  const decayedCount = scored.filter((m) => m.relevance < 0.1).length

  return {
    total,
    avgRelevance: Math.round(avgRelevance * 100) / 100,
    decayedCount,
    byCategory: Object.fromEntries(byCategory.map((g) => [g.category, g._count])),
    byAgentCount: byAgent.length,
    topRelevance: scored[0]?.relevance ?? 0,
  }
}

// ===== CONTEXT ENRICHMENT FOR WAVES =====

/**
 * Format relevant memories as context string for LLM prompts.
 */
export function formatMemoryContext(memories: MemoryWithRelevance[]): string {
  if (memories.length === 0) return ''

  const lines = memories.map((m, i) => {
    const relPct = Math.round(m.relevance * 100)
    const timeAgo = getTimeAgo(m.createdAt)
    return `[${i + 1}] [${m.category}] (${relPct}% relevancia, ${timeAgo}) ${m.content.slice(0, 300)}`
  })

  return `## Memorias Relevantes (Mem0)\n${lines.join('\n')}`
}

function getTimeAgo(date: Date): string {
  const hours = (Date.now() - date.getTime()) * HOURS_PER_MS
  if (hours < 1) return 'hace <1h'
  if (hours < 24) return `hace ${Math.round(hours)}h`
  return `hace ${Math.round(hours / 24)}d`
}

/**
 * Bulk-create memories from wave results (called after each wave completes).
 * Extracts insights from agent responses and stores them as long-term memories.
 */
export async function extractAndStoreWaveMemories(
  projectId: string,
  waveId: string,
  waveNumber: number,
  waveType: string,
  responses: Array<{
    agentId: string
    content: string
    confidence: number
    mood: string
  }>,
  agentIdMap: Record<string, string> // projectAgentId -> agentId
): Promise<number> {
  let count = 0

  for (const resp of responses) {
    if (!resp.content || resp.content.startsWith('Error')) continue

    const agentId = agentIdMap[resp.agentId]
    if (!agentId) continue

    // Determine category based on wave type
    const categoryMap: Record<string, string> = {
      brainstorm: 'insight',
      critique: 'pattern',
      synthesize: 'insight',
      execute: 'skill',
      quality_gate: 'fact',
    }

    // Extract a concise memory from the response (first meaningful sentence)
    const sentences = resp.content.split(/[.!?]\s/).filter((s) => s.trim().length > 20)
    const coreContent = sentences.slice(0, 2).join('. ').trim()

    if (coreContent.length < 30) continue

    await addMemory({
      projectId,
      agentId,
      content: `[${waveType.toUpperCase()} #${waveNumber}] ${coreContent}`,
      category: categoryMap[waveType] || 'general',
      tags: `${waveType},wave-${waveNumber},mood-${resp.mood}`,
      baseScore: Math.min(2, resp.confidence * 1.5),
      decayRate: resp.mood === 'enthusiastic' ? 0.03 : 0.06,
      sourceWaveId: waveId,
      sourceType: 'wave',
    })

    count++
  }

  return count
}
