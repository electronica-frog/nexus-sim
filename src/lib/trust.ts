import { db } from '@/lib/db'

/**
 * Calculate the trust delta for a single response based on mood and confidence.
 *
 * - Higher confidence → more trust gained
 * - Enthusiastic mood → +trust bonus
 * - Neutral mood → no modifier
 * - Skeptical mood → small penalty
 * - Concerned mood → larger penalty
 * - Delta is clamped between -0.05 and +0.10
 */
export function calculateTrustDelta(mood: string, confidence: number): number {
  // Base delta from confidence: center at 0.5
  let delta = (confidence - 0.5) * 0.05

  // Mood modifier
  switch (mood) {
    case 'enthusiastic':
      delta += 0.02
      break
    case 'neutral':
      delta += 0.0
      break
    case 'skeptical':
      delta -= 0.01
      break
    case 'concerned':
      delta -= 0.02
      break
    default:
      break
  }

  return Math.max(-0.05, Math.min(0.1, delta))
}

/**
 * Calculate peer validation bonus.
 * If other agents in the same wave express similar sentiment (enthusiastic/neutral),
 * the agent gets a small trust boost for agreement.
 */
function calculatePeerValidation(
  responses: Array<{ agentId: string; mood: string; confidence: number }>,
  currentAgentId: string,
  currentMood: string,
): number {
  if (responses.length <= 1) return 0

  const otherResponses = responses.filter((r) => r.agentId !== currentAgentId)
  if (otherResponses.length === 0) return 0

  // Count how many peers share similar sentiment
  let peerAgreement = 0
  for (const r of otherResponses) {
    if (currentMood === 'enthusiastic' && (r.mood === 'enthusiastic' || r.mood === 'neutral')) {
      peerAgreement += 0.005
    } else if (currentMood === 'neutral' && r.mood === 'neutral') {
      peerAgreement += 0.003
    }
  }

  return Math.min(0.02, peerAgreement)
}

/**
 * Update trust scores for all agents that responded in a wave.
 * Called after a wave completes.
 */
export async function updateTrustAfterWave(waveId: string, projectId: string): Promise<void> {
  // Fetch all responses for this wave with their projectAgent (for trust score)
  const responses = await db.response.findMany({
    where: { waveId },
    include: {
      projectAgent: {
        include: { agent: { select: { id: true } } },
      },
    },
  })

  if (responses.length === 0) return

  // Build a map for peer validation lookup
  const responseMap = responses.map((r) => ({
    agentId: r.agentId,
    mood: r.mood,
    confidence: r.confidence,
  }))

  // Calculate wave completion bonus (no failures = small bonus for everyone)
  const failedCount = responses.filter((r) => r.confidence === 0 && r.mood === 'concerned').length
  const completionBonus = failedCount === 0 ? 0.01 : 0

  // Update each agent's trust score
  for (const response of responses) {
    const pa = response.projectAgent
    if (!pa) continue

    const moodDelta = calculateTrustDelta(response.mood, response.confidence)
    const peerBonus = calculatePeerValidation(responseMap, response.agentId, response.mood)
    const totalDelta = moodDelta + peerBonus + completionBonus

    const currentTrust = pa.trustScore ?? 0.5
    const newTrust = Math.max(0, Math.min(1, currentTrust + totalDelta))

    await db.projectAgent.update({
      where: { id: pa.id },
      data: { trustScore: newTrust },
    })
  }
}

/**
 * Get trust-ranked agents for a project.
 * Returns agents sorted by trustScore descending.
 */
export async function getTrustRankedAgents(projectId: string, limit = 10) {
  const agents = await db.projectAgent.findMany({
    where: { projectId },
    include: { agent: { select: { id: true, agentId: true, name: true, division: true, emoji: true, color: true, vibe: true } } },
    orderBy: { trustScore: 'desc' },
    take: limit,
  })
  return agents
}
