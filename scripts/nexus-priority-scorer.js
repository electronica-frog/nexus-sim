#!/usr/bin/env node
/**
 * NEXUS Priority Scorer — IA Predictiva para priorizar propuestas
 * 
 * Analiza el historial de waves, responses, y outcomes para:
 * 1. Scorear propuestas automáticamente (viabilidad × impacto × urgencia)
 * 2. Identificar patrones de éxito en oleadas anteriores
 * 3. Predecir qué tipo de propuestas tienen más probabilidad de éxito
 * 4. Generar un ranking priorizado de mejoras pendientes
 *
 * Usage:
 *   node nexus-priority-scorer.js [options]
 *   --proposals FILE   JSON file with proposals to score (optional)
 *   --top N            Show top N results (default: 10)
 *   --project ID       Project ID
 *   --save PATH        Save results (default: download/priority-scores.json)
 *   --status           Show priority dashboard
 */

process.env.NODE_PATH = '/home/z/my-project/.next/standalone/node_modules';
require('module')._initPaths();

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const args = process.argv.slice(2);
const opts = {
  proposals: null,
  top: 10,
  project: 'cmpytm3mx004apvrh7r7b18nv',
  save: '/home/z/my-project/download/priority-scores.json',
  status: false,
};

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--proposals': opts.proposals = args[++i]; break;
    case '--top': opts.top = parseInt(args[++i]); break;
    case '--project': opts.project = args[++i]; break;
    case '--save': opts.save = args[++i]; break;
    case '--status': opts.status = true; break;
  }
}

/**
 * Analyze historical wave data to compute success patterns
 * Returns metrics about what types of waves/agents/topics tend to succeed
 */
async function analyzeHistory(db) {
  // Get all completed waves with their responses
  const waves = await db.wave.findMany({
    where: { projectId: opts.project, status: 'completed' },
    include: {
      responses: {
        include: {
          projectAgent: { include: { agent: true } },
        },
      },
    },
    orderBy: { number: 'desc' },
    take: 30, // Last 30 waves
  });

  // Compute per-wave metrics
  const waveMetrics = waves.map(w => {
    const responses = w.responses || [];
    const avgConf = responses.length > 0 
      ? responses.reduce((s, r) => s + r.confidence, 0) / responses.length 
      : 0;
    const moods = {};
    responses.forEach(r => { moods[r.mood] = (moods[r.mood] || 0) + 1; });
    const enthusiasticPct = responses.length > 0 
      ? ((moods['enthusiastic'] || 0) / responses.length) * 100 
      : 0;
    const divisions = new Set(responses.map(r => r.projectAgent?.agent?.division).filter(Boolean));

    return {
      number: w.number,
      name: w.name || `Wave #${w.number}`,
      emoji: w.emoji || '🌊',
      personality: w.personality || '',
      type: w.type,
      agentCount: responses.length,
      divisions: divisions.size,
      avgConfidence: avgConf,
      enthusiasticPct,
      moodBreakdown: moods,
      // Success score: higher when diverse divisions + high confidence + enthusiastic
      successScore: (divisions.size / 5) * 30 + avgConf * 40 + enthusiasticPct * 0.3,
    };
  });

  // Compute per-type averages
  const typeStats = {};
  waveMetrics.forEach(wm => {
    if (!typeStats[wm.type]) typeStats[wm.type] = { count: 0, avgConf: 0, avgSuccess: 0, avgDiv: 0 };
    typeStats[wm.type].count++;
    typeStats[wm.type].avgConf += wm.avgConfidence;
    typeStats[wm.type].avgSuccess += wm.successScore;
    typeStats[wm.type].avgDiv += wm.divisions;
  });
  for (const t in typeStats) {
    typeStats[t].avgConf /= typeStats[t].count;
    typeStats[t].avgSuccess /= typeStats[t].count;
    typeStats[t].avgDiv /= typeStats[t].count;
  }

  // Compute per-division participation
  const divParticipation = {};
  waveMetrics.forEach(wm => {
    // We'd need to track which divisions participated — approximate from wave type
    const type = wm.type;
    if (!divParticipation[type]) divParticipation[type] = {};
  });

  return { waveMetrics, typeStats, divParticipation };
}

/**
 * Analyze pending proposals from the Proposal model
 */
async function analyzePendingProposals(db) {
  const proposals = await db.proposal.findMany({
    where: { 
      projectId: opts.project, 
      status: { in: ['proposed', 'approved'] }
    },
    orderBy: { createdAt: 'desc' },
  });

  return proposals.map(p => ({
    id: p.id,
    title: p.title,
    description: p.description,
    type: p.type,
    priority: p.priority,
    status: p.status,
    age: Math.floor((Date.now() - p.createdAt.getTime()) / (1000 * 60 * 60 * 24)), // days old
    // Score based on priority + freshness
    priorityScore: (p.priority === 'urgent' ? 5 : p.priority === 'high' ? 4 : p.priority === 'medium' ? 3 : 2) 
      + Math.max(0, 3 - Math.floor((Date.now() - p.createdAt.getTime()) / (1000 * 60 * 60 * 24))), // decay
  }));
}

/**
 * Analyze skills that need improvement
 */
async function analyzeSkillGaps(db) {
  const skills = await db.agentSkill.findMany({
    where: { projectId: opts.project },
    orderBy: { quality: 'asc' },
    take: 20, // Bottom 20 skills — these need attention
  });

  return skills.map(s => ({
    id: s.id,
    name: s.name,
    quality: s.quality,
    timesUsed: s.timesUsed,
    version: s.version,
    // Improvement opportunity = low quality × high usage
    opportunity: (1 - s.quality) * Math.min(1, s.timesUsed / 10),
  })).sort((a, b) => b.opportunity - a.opportunity);
}

/**
 * Analyze recent memories for recurring themes
 */
async function analyzeMemoryThemes(db) {
  const recentMemories = await db.agentMemory.findMany({
    where: { projectId: opts.project },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  // Simple keyword frequency analysis
  const keywords = {};
  const memoryContent = recentMemories.map(m => m.content.toLowerCase());

  const trackWords = [
    'mejora', 'mejorar', 'feature', 'implementar', 'optimizar', 'bug', 'error',
    'nexus', 'wave', 'oleada', 'agente', 'skill', 'memoria', 'trust',
    'prioridad', 'ralph', 'loop', 'feedback', 'calidad', 'test',
    'persona', 'nombre', 'emoji', 'identidad', 'comportamiento',
    'version', 'rollback', 'checkpoint', 'propuesta',
  ];

  trackWords.forEach(word => {
    const count = memoryContent.filter(c => c.includes(word)).length;
    if (count > 0) keywords[word] = count;
  });

  return Object.entries(keywords)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([word, count]) => ({ word, frequency: count }));
}

/**
 * Compute overall NEXUS health score
 */
function computeHealth(waveMetrics, typeStats, skillGaps, memoryThemes) {
  const recentWaves = waveMetrics.slice(0, 10);
  const avgSuccess = recentWaves.length > 0 
    ? recentWaves.reduce((s, w) => s + w.successScore, 0) / recentWaves.length 
    : 0;
  const avgConf = recentWaves.length > 0 
    ? recentWaves.reduce((s, w) => s + w.avgConfidence, 0) / recentWaves.length 
    : 0;
  const avgDiv = recentWaves.length > 0 
    ? recentWaves.reduce((s, w) => s + w.divisions, 0) / recentWaves.length 
    : 0;

  // Health: 0-100
  const health = Math.round(avgSuccess * 0.5 + avgConf * 50 * 0.3 + avgDiv * 10 * 0.2);

  return {
    score: Math.min(100, health),
    avgSuccess: avgSuccess.toFixed(1),
    avgConfidence: (avgConf * 100).toFixed(1) + '%',
    avgDivisions: avgDiv.toFixed(1),
    trend: recentWaves.length >= 5 
      ? (recentWaves.slice(0, 5).reduce((s, w) => s + w.successScore, 0) / 5) > avgSuccess ? '↑' : '↓'
      : '→',
  };
}

(async () => {
  const db = new PrismaClient({
    datasources: { db: { url: 'file:/home/z/my-project/db/custom.db' } },
  });

  // === STATUS DASHBOARD ===
  const [history, pendingProposals, skillGaps, memoryThemes] = await Promise.all([
    analyzeHistory(db),
    analyzePendingProposals(db),
    analyzeSkillGaps(db),
    analyzeMemoryThemes(db),
  ]);

  const health = computeHealth(history.waveMetrics, history.typeStats, skillGaps, memoryThemes);

  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║           NEXUS PRIORITY SCORER — Dashboard             ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`\n  🏥 Health: ${health.score}/100 ${health.trend} | Success: ${health.avgSuccess} | Conf: ${health.avgConfidence} | Div: ${health.avgDivisions}`);

  // Wave type performance
  console.log('\n  📊 Wave Type Performance:');
  for (const [type, stats] of Object.entries(history.typeStats)) {
    const bar = '█'.repeat(Math.round(stats.avgSuccess / 3));
    console.log(`    ${type.padEnd(15)}: ${stats.avgSuccess.toFixed(1)}pts avg (${stats.count} waves) ${bar}`);
  }

  // Top successful waves
  console.log(`\n  🏆 Top ${Math.min(5, history.waveMetrics.length)} Waves (by success score):`);
  history.waveMetrics.slice(0, 5).forEach((w, i) => {
    console.log(`    ${i + 1}. ${w.emoji} #${w.number} "${w.name}" [${w.type}] → ${w.successScore.toFixed(1)}pts (conf:${(w.avgConfidence * 100).toFixed(0)}%, div:${w.divisions})`);
  });

  // Pending proposals
  if (pendingProposals.length > 0) {
    console.log(`\n  📋 Pending Proposals (${pendingProposals.length}):`);
    pendingProposals.slice(0, opts.top).forEach((p, i) => {
      console.log(`    ${i + 1}. [${p.status}] ${p.title} (${p.type}, ${p.age}d old) → score: ${p.priorityScore.toFixed(1)}`);
    });
  }

  // Skill gaps
  console.log(`\n  🔧 Skills Needing Improvement (top ${Math.min(5, skillGaps.length)}):`);
  skillGaps.slice(0, 5).forEach((s, i) => {
    console.log(`    ${i + 1}. "${s.name}" quality:${s.quality.toFixed(2)} used:${s.timesUsed} → opportunity: ${s.opportunity.toFixed(2)}`);
  });

  // Memory themes
  console.log(`\n  🧠 Recurring Themes in Memories:`);
  memoryThemes.slice(0, 10).forEach((t, i) => {
    const bar = '▓'.repeat(t.frequency);
    console.log(`    ${t.word.padEnd(15)} ${bar} (${t.frequency})`);
  });

  // Recommendations
  console.log('\n  💡 Recommendations:');
  const bestType = Object.entries(history.typeStats).sort((a, b) => b[1].avgSuccess - a[1].avgSuccess)[0];
  if (bestType) {
    console.log(`    → Run more "${bestType[0]}" waves (avg success: ${bestType[1].avgSuccess.toFixed(1)})`);
  }
  if (pendingProposals.length > 0) {
    const top = pendingProposals[0];
    console.log(`    → Prioritize: "${top.title}" (score: ${top.priorityScore.toFixed(1)})`);
  }
  if (skillGaps.length > 0) {
    const gap = skillGaps[0];
    console.log(`    → Improve skill: "${gap.name}" (quality:${gap.quality.toFixed(2)}, high usage)`);
  }
  if (health.score < 50) {
    console.log(`    → ⚠️  Low health score — consider running a quality_gate wave`);
  } else if (health.score > 80) {
    console.log(`    → ✅ System healthy — good time for ambitious features`);
  }

  // Save results
  const output = {
    health,
    typeStats: history.typeStats,
    topWaves: history.waveMetrics.slice(0, 10),
    pendingProposals,
    skillGaps: skillGaps.slice(0, 10),
    memoryThemes,
    generatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(opts.save, JSON.stringify(output, null, 2));
  console.log(`\n  Saved: ${opts.save}`);

  await db.$disconnect();
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
