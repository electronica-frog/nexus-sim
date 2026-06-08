#!/usr/bin/env node
/**
 * NEXUS Priority Scorer — Analiza salud del sistema
 * Computa scores por wave, detecta gaps de skills, analiza memorias.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DB_PATH = '/home/z/my-project/db/custom.db';
const OUTPUT = '/home/z/my-project/download/priority-scores.json';
const RUN_DIR = '/home/z/my-project';

// Simple JSON query without Prisma
function query(sql, params = []) {
  const { execSync } = require('child_process');
  const paramStr = params.map(() => '?').join(',');
  const cmd = `sqlite3 -json "${DB_PATH}" "${sql.replace(/\?/g, p => `'${params.shift() || ''}'`)}"`;
  try {
    return JSON.parse(execSync(cmd, { encoding: 'utf8' }));
  } catch {
    return [];
  }
}

function main() {
  console.log('=== NEXUS Priority Scorer ===\n');

  // Count entities
  const agents = query("SELECT COUNT(*) as c FROM Agent");
  const waves = query("SELECT COUNT(*) as c FROM Wave");
  const memories = query("SELECT COUNT(*) as c FROM AgentMemory");
  const skills = query("SELECT COUNT(*) as c FROM AgentSkill");

  const agentCount = agents[0]?.c || 0;
  const waveCount = waves[0]?.c || 0;
  const memCount = memories[0]?.c || 0;
  const skillCount = skills[0]?.c || 0;

  console.log(`Agents: ${agentCount} | Waves: ${waveCount} | Memories: ${memCount} | Skills: ${skillCount}`);

  // Recent waves
  const recentWaves = query("SELECT number, type, status, result FROM Wave ORDER BY number DESC LIMIT 10");

  let totalScore = 0, scoredCount = 0;
  const waveScores = [];

  for (const w of recentWaves) {
    let score = 50; // base
    try {
      const data = JSON.parse(w.result || '{}');
      const responses = data.responses || [];
      if (responses.length > 0) {
        const avgConf = responses.reduce((s, r) => s + (r.confidence || 0), 0) / responses.length;
        const enthusiastic = responses.filter(r => r.mood === 'enthusiastic').length;
        const diversity = new Set(responses.map(r => r.agent?.division)).size;
        score = Math.round((avgConf * 40) + (enthusiastic / responses.length * 30) + (diversity * 10));
      }
    } catch {}
    waveScores.push({ wave: w.number, type: w.type, score, agents: 0 });
    if (w.status === 'completed') { totalScore += score; scoredCount++; }
  }

  const avgHealth = scoredCount > 0 ? Math.round(totalScore / scoredCount) : 50;

  console.log(`\nHealth Score: ${avgHealth}/100`);
  console.log(`Recent waves:`);
  waveScores.forEach(ws => {
    const bar = '█'.repeat(Math.round(ws.score / 5)) + '░'.repeat(20 - Math.round(ws.score / 5));
    console.log(`  #${ws.wave} ${ws.type.padEnd(12)} ${bar} ${ws.score}`);
  });

  const report = {
    timestamp: new Date().toISOString(),
    healthScore: avgHealth,
    agentCount, waveCount, memCount, skillCount,
    recentWaves: waveScores,
    recommendation: avgHealth < 50
      ? 'Consider running a quality_gate wave to improve health score'
      : 'System is healthy. Continue with auto-mejora cycles.'
  };

  fs.writeFileSync(OUTPUT, JSON.stringify(report, null, 2));
  console.log(`\n  Saved: ${OUTPUT}`);

  if (avgHealth < 50) console.log(`  → ⚠️ Low health score — consider running a quality_gate wave`);
  else console.log(`  ✅ System healthy`);
}

main();
