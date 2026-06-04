import { db } from '@/lib/db'
import * as fs from 'fs'
import * as path from 'path'

interface AgentData {
  agentId: string
  name: string
  division: string
  emoji: string
  color: string
  vibe: string
  personality: string
  tools: string
}

function parseYamlFrontmatter(content: string): {
  name: string
  description: string
  color: string
  emoji: string
  vibe: string
  tools: string
} & Record<string, string> {
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) {
    return { name: '', description: '', color: 'cyan', emoji: '🤖', vibe: '', tools: '' }
  }

  const frontmatter: Record<string, string> = {
    name: '',
    description: '',
    color: 'cyan',
    emoji: '🤖',
    vibe: '',
    tools: '',
  }

  const lines = match[1].split('\n')
  for (const line of lines) {
    const colonIdx = line.indexOf(':')
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim()
      const value = line.slice(colonIdx + 1).trim()
      if (key in frontmatter) {
        frontmatter[key] = value
      }
    }
  }

  return frontmatter
}

function extractBody(content: string): string {
  const match = content.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/)
  return match ? match[1].trim() : content.trim()
}

function isValidAgentDirectory(dirname: string): boolean {
  const skipDirs = [
    'scripts', 'examples', 'integrations', 'strategy',
    'academic', 'game-development',
  ]
  if (skipDirs.includes(dirname)) return false
  // Skip subdirectories like roblox-studio, godot, unity, unreal-engine, blender, mcp-memory
  return !dirname.includes('-') || ['paid-media', 'project-management'].includes(dirname)
}

function parseAllAgents(baseDir: string): AgentData[] {
  const agents: AgentData[] = []

  const entries = fs.readdirSync(baseDir, { withFileTypes: true })
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    if (!isValidAgentDirectory(entry.name)) continue

    const dirPath = path.join(baseDir, entry.name)
    const files = fs.readdirSync(dirPath)

    for (const file of files) {
      if (!file.endsWith('.md')) continue
      if (file.startsWith('.')) continue

      const filePath = path.join(dirPath, file)
      const content = fs.readFileSync(filePath, 'utf-8')

      // Skip non-agent files (playbooks, runbooks, templates, etc.)
      const fm = parseYamlFrontmatter(content)
      if (!fm.name && !fm.emoji) continue

      const agentId = file.replace('.md', '')
      const body = extractBody(content)

      agents.push({
        agentId,
        name: fm.name || agentId,
        division: entry.name,
        emoji: fm.emoji || '🤖',
        color: fm.color || 'cyan',
        vibe: fm.vibe || '',
        personality: body,
        tools: fm.tools || '',
      })
    }
  }

  return agents
}

export async function seedAgents() {
  const agencyDir = path.join(process.cwd(), 'agency-agents')
  const agents = parseAllAgents(agencyDir)

  console.log(`Found ${agents.length} agent definitions`)

  let upsertedCount = 0
  for (const agent of agents) {
    await db.agent.upsert({
      where: { agentId: agent.agentId },
      create: agent,
      update: {
        name: agent.name,
        division: agent.division,
        emoji: agent.emoji,
        color: agent.color,
        vibe: agent.vibe,
        personality: agent.personality,
        tools: agent.tools,
      },
    })
    upsertedCount++
  }

  console.log(`Upserted ${upsertedCount} agents`)

  // Create default demo project
  const existingProject = await db.project.findFirst({ where: { name: 'NEXUS Demo' } })
  let project
  if (!existingProject) {
    project = await db.project.create({
      data: {
        name: 'NEXUS Demo',
        description: 'Proyecto de demostración de NEXUS Sim — Simulación multi-agente colaborativa',
        status: 'active',
      },
    })
    console.log(`Created project: ${project.id}`)

    // Assign all agents to the project
    const allAgents = await db.agent.findMany()
    for (const agent of allAgents) {
      await db.projectAgent.upsert({
        where: {
          projectId_agentId: {
            projectId: project.id,
            agentId: agent.id,
          },
        },
        create: {
          projectId: project.id,
          agentId: agent.id,
          role: determineRole(agent),
          status: 'idle',
        },
        update: {},
      })
    }
    console.log(`Assigned ${allAgents.length} agents to project`)
  } else {
    project = existingProject
    // Ensure all new agents are assigned
    const allAgents = await db.agent.findMany()
    const existingAssignments = await db.projectAgent.findMany({
      where: { projectId: project.id },
      select: { agentId: true },
    })
    const assignedIds = new Set(existingAssignments.map((a) => a.agentId))

    let newAssignments = 0
    for (const agent of allAgents) {
      if (!assignedIds.has(agent.id)) {
        await db.projectAgent.create({
          data: {
            projectId: project.id,
            agentId: agent.id,
            role: determineRole(agent),
            status: 'idle',
          },
        })
        newAssignments++
      }
    }
    if (newAssignments > 0) {
      console.log(`Added ${newAssignments} new agents to existing project`)
    }
  }

  return {
    agentsCount: upsertedCount,
    projectId: project.id,
    projectName: project.name,
  }
}

function determineRole(agent: { agentId: string; division: string }): string {
  if (agent.agentId.includes('orchestrator')) return 'orchestrator'
  if (agent.division === 'testing') return 'qa'
  if (agent.division === 'specialized') return 'specialist'
  return 'team'
}

// Run seed if called directly
const isMainModule = process.argv[1]?.endsWith('seed.ts')
if (isMainModule) {
  seedAgents()
    .then((result) => {
      console.log('Seed complete:', result)
      process.exit(0)
    })
    .catch((err) => {
      console.error('Seed failed:', err)
      process.exit(1)
    })
}
