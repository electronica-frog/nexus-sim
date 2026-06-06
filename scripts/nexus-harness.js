#!/usr/bin/env node
/**
 * NEXUS Harness — Direct agent simulation without Next.js server overhead
 * Uses z-ai-web-dev-sdk + Prisma Client (from standalone build) for fast wave execution.
 *
 * Usage:
 *   node nexus-harness.js [options]
 *   --agents N     Number of agents to run (default: 5)
 *   --type TYPE    brainstorm|critique|synthesize|execute|quality_gate (default: brainstorm)
 *   --prompt TEXT  The prompt for the wave
 *   --project ID   Project ID
 *   --division DIV Filter by division
 *   --dry-run      Show selected agents without LLM calls
 *   --save PATH    Save results file path
 *   --status       Only show DB status
 */

// Add standalone modules to path
process.env.NODE_PATH = '/home/z/my-project/.next/standalone/node_modules';
require('module')._initPaths();

const ZAI = require('z-ai-web-dev-sdk').default;
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

// Parse args
const args = process.argv.slice(2);
const opts = {
  agents: 5, type: 'brainstorm',
  prompt: '¿Cómo podemos mejorar NEXUS Sim v2 para que sea más útil como herramienta de IA colaborativa dentro de Discord? ¿Qué features faltan, qué se puede optimizar, y cómo deberíamos integrarlo con el chat?',
  project: 'cmpytm3mx004apvrh7r7b18nv',
  division: null, dryRun: false,
  save: '/home/z/my-project/download/wave-results.json',
  status: false,
};
for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--agents': opts.agents = parseInt(args[++i]); break;
    case '--type': opts.type = args[++i]; break;
    case '--prompt': opts.prompt = args.slice(++i).join(' '); i = args.length; break;
    case '--project': opts.project = args[++i]; break;
    case '--division': opts.division = args[++i]; break;
    case '--dry-run': opts.dryRun = true; break;
    case '--save': opts.save = args[++i]; break;
    case '--status': opts.status = true; break;
  }
}

const WAVE_CONTEXT = {
  brainstorm: 'Estás en una sesión de BRAINSTORM. Tu objetivo es generar ideas creativas, proponer soluciones innovadoras, y pensar fuera de lo convencional. Sé entusiasta y proactivo.',
  critique: 'Estás en una sesión de CRÍTICA.',
  synthesize: 'Estás en una sesión de SÍNTESIS.',
  execute: 'Estás en una sesión de EJECUCIÓN.',
  quality_gate: 'Estás en un CONTROL DE CALIDAD.',
};

const WAVE_TEMPS = { brainstorm: 0.9, critique: 0.3, synthesize: 0.5, execute: 0.4, quality_gate: 0.2 };

const DIVISION_MAP = {
  brainstorm: ['product', 'marketing', 'design', 'engineering', 'specialized', 'testing', 'sales', 'project-management', 'support', 'finance', 'paid-media'],
  critique: ['testing', 'specialized', 'engineering', 'product', 'project-management'],
  synthesize: ['specialized', 'project-management', 'product', 'engineering', 'design'],
  execute: ['engineering', 'design', 'product'],
  quality_gate: ['testing', 'specialized', 'engineering'],
};

function parseMoodConf(content) {
  let mood = 'neutral', confidence = 0.5;
  const mm = content.match(/\[MOOD:\s*(enthusiastic|neutral|skeptical|concerned)\]/i);
  const cm = content.match(/\[CONFIDENCE:\s*([\d.]+)\]/i);
  if (mm) mood = mm[1].toLowerCase();
  if (cm) confidence = Math.min(1, Math.max(0, parseFloat(cm[1])));
  return { content: content.replace(/\[MOOD:\s*\w+\]/gi, '').replace(/\[CONFIDENCE:\s*[\d.]+\]/gi, '').trim(), confidence, mood };
}

async function callLLM(agent, waveType, prompt, memories) {
  const zai = await ZAI.create();
  const parts = [
    `Eres ${agent.emoji} **${agent.name}**, actuando dentro del sistema NEXUS.`,
    '', `## Tu Personalidad`, agent.personality.slice(0, 1500), '',
    `## Contexto de la Oleada`, WAVE_CONTEXT[waveType] || '',
  ];
  if (memories.length > 0) parts.push('', '## Tus Memorias Previas', memories.join('\n'));
  parts.push(
    '', '## Tu Tarea',
    `Responde como ${agent.name}. Sé conciso (100-300 palabras). Opina con fundamentos.`,
    '',
    'Al final incluye: [MOOD: enthusiastic|neutral|skeptical|concerned] [CONFIDENCE: 0.X]',
  );
  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'system', content: parts.join('\n') },
      { role: 'user', content: `El tema es:\n\n${prompt}\n\n¿Tu perspectiva como ${agent.name}?` },
    ],
    thinking: { type: 'disabled' },
    temperature: WAVE_TEMPS[waveType] ?? 0.7,
  });
  return parseMoodConf(completion.choices?.[0]?.message?.content || 'Sin respuesta.');
}

(async () => {
  const db = new PrismaClient({
    datasources: { db: { url: 'file:/home/z/my-project/db/custom.db' } },
  });

  if (opts.status) {
    const [agentCt, paCt, waveCt, memCt, skillCt, trustAvg] = await Promise.all([
      db.agent.count(),
      db.projectAgent.count({ where: { projectId: opts.project } }),
      db.wave.count({ where: { projectId: opts.project } }),
      db.agentMemory.count({ where: { projectId: opts.project } }),
      db.agentSkill.count({ where: { projectId: opts.project } }),
      db.projectAgent.aggregate({ where: { projectId: opts.project }, _avg: { trustScore: true } }),
    ]);
    console.log('=== NEXUS STATUS ===');
    console.log(`Agents: ${agentCt} | Project: ${paCt} | Waves: ${waveCt} | Memories: ${memCt} | Skills: ${skillCt}`);
    console.log(`Avg Trust: ${(trustAvg._avg.trustScore || 0).toFixed(3)}`);
    const divs = await db.projectAgent.findMany({ where: { projectId: opts.project }, include: { agent: { select: { division: true } } }, distinct: ['agentId'] });
    const divMap = {};
    divs.forEach(d => { const div = d.agent.division; divMap[div] = (divMap[div] || 0) + 1; });
    console.log('\nDivisions:', Object.entries(divMap).sort((a, b) => b[1] - a[1]).map(([d, c]) => `${d}(${c})`).join(', '));
    await db.$disconnect();
    return;
  }

  // Select agents
  const divisions = opts.division ? [opts.division] : (DIVISION_MAP[opts.type] || []);
  const agents = await db.projectAgent.findMany({
    where: { projectId: opts.project, agent: { division: { in: divisions } } },
    include: { agent: true },
    orderBy: { trustScore: 'desc' },
    take: opts.agents,
  });

  console.log(`=== NEXUS HARNESS ===`);
  console.log(`Type: ${opts.type} | Agents: ${agents.length}`);
  agents.forEach(a => console.log(`  ${a.agent.emoji} ${a.agent.name} [${a.agent.division}] trust:${a.trustScore.toFixed(3)}`));
  console.log(`Prompt: ${opts.prompt.slice(0, 80)}...`);

  if (opts.dryRun) { console.log('DRY RUN'); await db.$disconnect(); return; }

  const results = [];
  const startTime = Date.now();

  // Create wave
  const lastWave = await db.wave.findFirst({ where: { projectId: opts.project }, orderBy: { number: 'desc' } });
  const waveNumber = (lastWave?.number || 0) + 1;
  const wave = await db.wave.create({
    data: { projectId: opts.project, number: waveNumber, type: opts.type, status: 'running', prompt: opts.prompt },
  });

  for (let i = 0; i < agents.length; i++) {
    const pa = agents[i];
    const agent = pa.agent;
    console.log(`\n[${i + 1}/${agents.length}] ${agent.emoji} ${agent.name}...`);

    await db.projectAgent.update({ where: { id: pa.id }, data: { status: 'thinking', waveNumber } });

    const memories = await db.agentMemory.findMany({
      where: { projectId: opts.project, agentId: agent.id },
      orderBy: { importance: 'desc' }, take: 3,
    });

    try {
      const t0 = Date.now();
      const llm = await callLLM(agent, opts.type, opts.prompt, memories.map(m => `[${m.type}]: ${m.content.slice(0, 150)}`));
      const dt = ((Date.now() - t0) / 1000).toFixed(1);

      console.log(`  (${dt}s) ${llm.mood} conf:${llm.confidence.toFixed(2)} | ${llm.content.slice(0, 150).replace(/\n/g, ' ')}...`);

      await db.response.create({
        data: { waveId: wave.id, agentId: pa.id, content: llm.content, confidence: llm.confidence, mood: llm.mood },
      });

      // Save memory
      await db.agentMemory.create({
        data: {
          projectId: opts.project, agentId: agent.id, type: 'learning',
          content: `[${opts.type}] #${waveNumber}: ${llm.content.slice(0, 250)}`,
          tags: `${opts.type},wave${waveNumber}`, importance: Math.min(1, llm.confidence * 0.8),
        },
      });

      await db.projectAgent.update({ where: { id: pa.id }, data: { status: 'done' } });

      results.push({
        agent: { name: agent.name, division: agent.division, emoji: agent.emoji, trustScore: pa.trustScore },
        mood: llm.mood, confidence: llm.confidence, content: llm.content, elapsed: parseFloat(dt),
      });
    } catch (err) {
      console.error(`  ERROR: ${err.message}`);
      await db.projectAgent.update({ where: { id: pa.id }, data: { status: 'failed' } });
      results.push({ agent: { name: agent.name, division: agent.division, emoji: agent.emoji }, mood: 'concerned', confidence: 0, content: `Error: ${err.message}`, error: true });
    }
  }

  await db.wave.update({ where: { id: wave.id }, data: { status: 'completed', completedAt: new Date() } });

  const total = ((Date.now() - startTime) / 1000).toFixed(1);
  const avgConf = results.reduce((s, r) => s + r.confidence, 0) / results.length;
  const moods = {};
  results.forEach(r => { moods[r.mood] = (moods[r.mood] || 0) + 1; });

  console.log(`\n=== COMPLETE in ${total}s ===`);
  console.log(`Wave #${waveNumber} | ID: ${wave.id}`);
  console.log(`Agents: ${results.length} | Avg Conf: ${avgConf.toFixed(3)}`);
  console.log(`Moods: ${Object.entries(moods).map(([m, c]) => `${m}(${c})`).join(', ')}`);

  const output = { waveId: wave.id, waveNumber, type: opts.type, prompt: opts.prompt, projectId: opts.project, totalElapsed: parseFloat(total), avgConfidence: avgConf, moodBreakdown: moods, responses: results };
  fs.writeFileSync(opts.save, JSON.stringify(output, null, 2));
  console.log(`Saved: ${opts.save}`);

  await db.$disconnect();
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
