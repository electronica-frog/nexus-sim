import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

export const dynamic = 'force-static'
export const revalidate = 300 // 5 min cache

const DATA_DIR = path.join(process.cwd(), 'public', 'nexus-data')

async function readJson(name: string) {
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, name), 'utf-8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/**
 * GET /api/nexus/data?file=health|agents|waves|memories|skills|queue|latest-wave|all
 * Serves static JSON data exported by nexus-export.js
 * This is the Vercel-compatible endpoint — no DB needed.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const file = searchParams.get('file') || 'health'

  if (file === 'all') {
    const [health, agents, waves, memories, skills, queue] = await Promise.all([
      readJson('health.json'),
      readJson('agents.json'),
      readJson('waves.json'),
      readJson('memories.json'),
      readJson('skills.json'),
      readJson('queue.json'),
    ])
    return NextResponse.json({ health, agents, waves, memories, skills, queue })
  }

  const data = await readJson(`${file}.json`)
  if (!data) {
    return NextResponse.json({ error: `File "${file}.json" not found` }, { status: 404 })
  }
  return NextResponse.json(data)
}
