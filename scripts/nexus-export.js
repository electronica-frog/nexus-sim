#!/usr/bin/env node
/**
 * NEXUS DB → JSON Exporter
 * Exporta la DB SQLite a archivos JSON listos para GitHub.
 * Vercel los sirve como static data — no necesita DB en producción.
 *
 * Uso: node scripts/nexus-export.js [--dir OUTPUT_DIR]
 * Default: /home/z/my-project/public/nexus-data/
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const DB_PATH = 'file:/home/z/my-project/db/custom.db';
const DEFAULT_DIR = '/home/z/my-project/public/nexus-data';

const args = process.argv.slice(2);
let outDir = DEFAULT_DIR;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--dir' && args[i + 1]) outDir = args[++i];
}

async function main() {
  const db = new PrismaClient({
    datasources: { db: { url: DB_PATH } }
  });

  console.log('=== NEXUS EXPORT → JSON ===');
  console.log(`Output: ${outDir}`);

  // Ensure output dir exists
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(path.join(outDir, 'reports'), { recursive: true });

  const now = new Date().toISOString();

  // Get first (and likely only) project
  const project = await db.project.findFirst();
  if (!project) {
    console.error('ERROR: No project found in DB');
    process.exit(1);
  }
  const pid = project.id;
  console.log(`Project: ${project.name} (${pid})`);

  // 1. Export agents with their project trust scores
  console.log('Exporting agents...');
  const agents = await db.agent.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true, agentId: true, name: true, division: true,
      emoji: true, vibe: true, personality: true,
      projectAgents: {
        where: { projectId: pid },
        select: {
          role: true, status: true, waveNumber: true,
          trustScore: true
        }
      }
    }
  });

  const agentsExport = agents.map(a => {
    const pa = a.projectAgents[0] || {};
    return {
      id: a.id,
      agentId: a.agentId,
      name: a.name,
      emoji: a.emoji,
      division: a.division,
      vibe: a.vibe,
      personality: a.personality.slice(0, 200), // truncate for size
      trustScore: pa.trustScore || 0.5,
      waves: pa.waveNumber || 0,
      role: pa.role || 'team',
      status: pa.status || 'idle'
    };
  });

  // Sort by trustScore descending
  agentsExport.sort((a, b) => b.trustScore - a.trustScore);
  writeJson('agents.json', agentsExport);

  // 2. Export waves
  console.log('Exporting waves...');
  const waves = await db.wave.findMany({
    where: { projectId: pid },
    orderBy: { number: 'desc' },
    select: {
      number: true, type: true, status: true,
      name: true, emoji: true, personality: true,
      prompt: true, result: true,
      createdAt: true, completedAt: true,
      responses: {
        select: {
          content: true, confidence: true, mood: true,
          projectAgent: {
            select: {
              agent: { select: { name: true, emoji: true, division: true } }
            }
          }
        }
      }
    }
  });

  const wavesExport = waves.map(w => {
    const moods = {};
    let confSum = 0;
    w.responses.forEach(r => {
      moods[r.mood] = (moods[r.mood] || 0) + 1;
      confSum += r.confidence;
    });
    return {
      number: w.number,
      type: w.type,
      status: w.status,
      name: w.name,
      emoji: w.emoji,
      personality: w.personality,
      agentCount: w.responses.length,
      avgConfidence: w.responses.length > 0 ? +(confSum / w.responses.length).toFixed(3) : 0,
      moodBreakdown: moods,
      prompt: w.prompt.slice(0, 500),
      result: (w.result || '').slice(0, 1000),
      createdAt: w.createdAt,
      completedAt: w.completedAt,
      agents: w.responses.map(r => ({
        name: r.projectAgent?.agent?.name || 'Unknown',
        emoji: r.projectAgent?.agent?.emoji || '🤖',
        division: r.projectAgent?.agent?.division || '',
        confidence: r.confidence,
        mood: r.mood,
        content: r.content.slice(0, 300)
      }))
    };
  });
  writeJson('waves.json', wavesExport);

  // 3. Export memories (top 50 by importance)
  console.log('Exporting memories...');
  const memories = await db.agentMemory.findMany({
    where: { projectId: pid },
    orderBy: { importance: 'desc' },
    take: 50,
    select: {
      id: true, agentId: true, type: true, content: true,
      importance: true, tags: true, createdAt: true, updatedAt: true
    }
  });
  writeJson('memories.json', memories);

  // 4. Export skills (top 50 by quality)
  console.log('Exporting skills...');
  const skills = await db.agentSkill.findMany({
    where: { projectId: pid },
    orderBy: { quality: 'desc' },
    take: 50,
    select: {
      id: true, agentId: true, name: true, description: true,
      quality: true, precision: true, version: true,
      timesUsed: true, feedbackScore: true, feedbackCount: true,
      createdAt: true, updatedAt: true
    }
  });
  writeJson('skills.json', skills);

  // 5. Export health snapshot
  console.log('Computing health...');
  const totalAgents = agents.length;
  const totalWaves = waves.length;
  const totalMemories = await db.agentMemory.count({ where: { projectId: pid } });
  const totalSkills = await db.agentSkill.count({ where: { projectId: pid } });

  const trustScores = agentsExport.map(a => a.trustScore);
  const avgTrust = trustScores.length > 0
    ? trustScores.reduce((a, b) => a + b, 0) / trustScores.length
    : 0;

  // Division breakdown
  const divisions = {};
  agentsExport.forEach(a => {
    if (!divisions[a.division]) divisions[a.division] = { count: 0, trustSum: 0 };
    divisions[a.division].count++;
    divisions[a.division].trustSum += a.trustScore;
  });

  // Wave type breakdown (all)
  const waveTypeStats = {};
  wavesExport.forEach(w => {
    if (!waveTypeStats[w.type]) waveTypeStats[w.type] = { count: 0, confSum: 0, errors: 0 };
    waveTypeStats[w.type].count++;
    waveTypeStats[w.type].confSum += w.avgConfidence;
    if (w.status === 'failed') waveTypeStats[w.type].errors++;
  });
  Object.values(waveTypeStats).forEach(s => {
    s.avgConf = s.count > 0 ? +(s.confSum / s.count).toFixed(3) : 0;
    delete s.confSum;
  });

  // Health score (0-100)
  const healthScore = Math.round(
    Math.min(100, Math.max(0,
      avgTrust * 60 +
      Math.min(15, totalWaves * 0.15) +
      Math.min(15, totalMemories * 0.04) +
      Math.min(10, totalSkills * 0.08)
    ))
  );

  const health = {
    exportedAt: now,
    healthScore,
    totals: { agents: totalAgents, waves: totalWaves, memories: totalMemories, skills: totalSkills },
    avgTrust: +avgTrust.toFixed(3),
    divisions: Object.entries(divisions)
      .map(([name, d]) => ({ name, count: d.count, avgTrust: +(d.trustSum / d.count).toFixed(3) }))
      .sort((a, b) => b.count - a.count),
    waveTypeStats,
    lastWaves: wavesExport.slice(0, 5).map(w => ({
      number: w.number, type: w.type, status: w.status,
      name: w.name, emoji: w.emoji, agents: w.agentCount,
      confidence: w.avgConfidence, mood: w.moodBreakdown
    }))
  };
  writeJson('health.json', health);

  // 6. Copy latest wave results
  const waveResultsPath = '/home/z/my-project/download/wave-results.json';
  if (fs.existsSync(waveResultsPath)) {
    console.log('Copying latest wave results...');
    fs.copyFileSync(waveResultsPath, path.join(outDir, 'latest-wave.json'));
  }

  // 7. Export task queue status
  const taskListPath = '/home/z/my-project/skills/nexus-auto-mejora/task-list.json';
  if (fs.existsSync(taskListPath)) {
    console.log('Copying task queue...');
    const taskData = JSON.parse(fs.readFileSync(taskListPath, 'utf8'));
    const queue = {
      cycle: taskData.cycle,
      maxCyclesPerDay: taskData.maxCyclesPerDay,
      cyclesCompletedToday: taskData.cyclesCompletedToday,
      tasks: taskData.tasks.map(t => ({
        id: t.id, name: t.name, type: t.type,
        status: t.status, lastRun: t.lastRun,
        failCount: t.failCount, description: t.description
      }))
    };
    writeJson('queue.json', queue);
  }

  // 8. Copy recent reports
  const reportDir = '/home/z/my-project/download';
  try {
    const reports = fs.readdirSync(reportDir)
      .filter(f => f.match(/nexus-report|nexus-cycle/))
      .sort().reverse().slice(0, 5);
    reports.forEach(r => {
      const src = path.join(reportDir, r);
      if (fs.statSync(src).size < 500000) {
        fs.copyFileSync(src, path.join(outDir, 'reports', r));
      }
    });
  } catch (e) { /* ignore */ }

  // Summary
  console.log(`\n=== EXPORT COMPLETE ===`);
  console.log(`  Agents:    ${totalAgents}`);
  console.log(`  Waves:     ${totalWaves}`);
  console.log(`  Memories:  ${totalMemories}`);
  console.log(`  Skills:    ${totalSkills}`);
  console.log(`  Health:    ${healthScore}/100`);
  console.log(`  Trust avg: ${avgTrust.toFixed(3)}`);
  console.log(`  Files:     ${countFiles(outDir)}`);
  console.log(`  Size:      ${dirSize(outDir)}`);

  await db.$disconnect();
}

function writeJson(name, data) {
  fs.writeFileSync(path.join(outDir, name), JSON.stringify(data, null, 2));
}

function countFiles(dir) {
  let c = 0;
  function walk(d) {
    for (const f of fs.readdirSync(d)) {
      const fp = path.join(d, f);
      if (fs.statSync(fp).isDirectory()) walk(fp);
      else c++;
    }
  }
  walk(dir);
  return c;
}

function dirSize(dir) {
  let total = 0;
  function walk(d) {
    for (const f of fs.readdirSync(d)) {
      const fp = path.join(d, f);
      const s = fs.statSync(fp);
      total += s.size;
      if (s.isDirectory()) walk(fp);
    }
  }
  walk(dir);
  return (total / 1024).toFixed(1) + ' KB';
}

main().catch(e => {
  console.error('EXPORT ERROR:', e.message);
  process.exit(1);
});
