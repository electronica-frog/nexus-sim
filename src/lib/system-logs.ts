import { db } from '@/lib/db'

export type SystemLogType =
  | 'wave_created'
  | 'wave_completed'
  | 'skill_learned'
  | 'spec_created'
  | 'proposal_created'
  | 'trust_change'
  | 'pipeline_started'
  | 'pipeline_completed'

/**
 * Add a system log entry for a project
 */
export async function addLog(
  projectId: string,
  type: SystemLogType,
  message: string,
  metadata?: Record<string, unknown>,
) {
  try {
    await db.systemLog.create({
      data: {
        projectId,
        type,
        message,
        metadata: metadata ? JSON.stringify(metadata) : '',
      },
    })
  } catch (err) {
    // Non-blocking: logging should never break the main flow
    console.error('Failed to write system log:', err)
  }
}

/**
 * Get recent system logs for a project
 */
export async function getRecentLogs(projectId: string, limit = 50) {
  return db.systemLog.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}
