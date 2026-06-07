#!/usr/bin/env node
/**
 * NEXUS Harness v2 — Direct agent simulation with self-naming waves
 * Uses z-ai-web-dev-sdk + Prisma Client for fast wave execution.
 *
 * v2 additions:
 *   - Waves choose their own name, emoji, and personality
 *   - Agents propose names before the wave starts
 *   - Wave identity is stored in DB
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
  critique: 'Estás en una sesión de CRÍTICA. Evalúa con rigor, encuentra flaws, y rankea propuestas.',
  synthesize: 'Estás en una sesión de SÍNTESIS. Fusiona las mejores ideas en propuestas concretas y accionables.',
  execute: 'Estás en una sesión de EJECUCIÓN. Diseña soluciones concretas con código.',
  quality_gate: 'Estás en un CONTROL DE CALIDAD. Valida, puntúa, y asegúra la calidad.',
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

/**
 * WAVE NAMING — Agents propose names, emoji, personality for the wave
 * Returns { name, emoji, personality } chosen by consensus
 */
async function generateWaveIdentity(db, selectedAgents, waveType, prompt) {
  console.log('\n🎭 NAMING PHASE — Agents proposing wave identity...');
  
  // Pick 3 diverse agents for naming (first, middle, last in trust ranking)
  const namers = selectedAgents.length >= 3
    ? [selectedAgents[0], selectedAgents[Math.floor(selectedAgents.length / 2)], selectedAgents[selectedAgents.length - 1]]
    : selectedAgents.slice(0, 3);

  const namingPrompt = `Estás participando en una oleada de NEXUS. Es una oleada tipo "${waveType}".
El tema general es: "${prompt.slice(0, 100)}"

Tu tarea ESPECÍFICA: Propone un NOMBRE creativo para esta oleada. No "Wave #38" sino algo con identidad.
Incluye:
1. Un NOMBRE (2-4 palabras, evocador, en español o inglés)
2. Un EMOJI que represente la energía de la oleada
3. Una PERSONALIDAD colectiva (1-2 palabras que describan el tono: ej. "audaz y curiosa", "precisa y escéptica")

Responde SOLO en este formato exacto:
NOMBRE: [tu nombre propuesto]
EMOJI: [un emoji]
PERSONALIDAD: [1-2 palabras]`;

  const proposals = [];
  
  for (const pa of namers) {
    const agent = pa.agent;
    try {
      const zai = await ZAI.create();
      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: `Eres ${agent.emoji} ${agent.name} de NEXUS. ${agent.personality.slice(0, 300)}` },
          { role: 'user', content: namingPrompt },
        ],
        thinking: { type: 'disabled' },
        temperature: 1.0, // High temp for creative names
      });
      
      const raw = completion.choices?.[0]?.message?.content || '';
      const nameMatch = raw.match(/NOMBRE:\s*(.+)/i);
      const emojiMatch = raw.match(/EMOJI:\s*(\S+)/i);
      const personalityMatch = raw.match(/PERSONALIDAD:\s*(.+)/i);
      
      const proposal = {
        name: nameMatch ? nameMatch[1].trim().slice(0, 50) : `Oleada ${waveType}`,
        emoji: emojiMatch ? emojiMatch[1].trim().slice(0, 4) : '🌊',
        personality: personalityMatch ? personalityMatch[1].trim().slice(0, 60) : 'curiosa',
        agent: agent.name,
        raw: raw.trim(),
      };
      
      proposals.push(proposal);
      console.log(`  ${agent.emoji} ${agent.name} propone: "${proposal.emoji} ${proposal.name}" (${proposal.personality})`);
    } catch (err) {
      console.log(`  ${agent.emoji} ${agent.name}: Error proponiendo nombre: ${err.message}`);
      proposals.push({ name: `Oleada ${waveType}`, emoji: '🌊', personality: 'adaptable', agent: agent.name });
    }
  }

  // Simple consensus: pick the first proposal (they're ordered by trust score)
  // Future: could do LLM-based voting
  const chosen = proposals[0];
  console.log(`\n  ✅ Identidad elegida: "${chosen.emoji} ${chosen.name}" — ${chosen.personality}`);
  console.log(`     (propuesta por ${chosen.agent})`);
  
  return chosen;
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
    
    // Show last named waves
    const namedWaves = await db.wave.findMany({ 
      where: { projectId: opts.project, name: { not: '' } }, 
      orderBy: { number: 'desc' }, take: 5 
    });
    if (namedWaves.length > 0) {
      console.log('\nRecent named waves:');
      namedWaves.forEach(w => console.log(`  #${w.number} ${w.emoji} ${w.name} (${w.personality})`));
    }
    
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

  console.log(`=== NEXUS HARNESS v2 ===`);
  console.log(`Type: ${opts.type} | Agents: ${agents.length}`);
  agents.forEach(a => console.log(`  ${a.agent.emoji} ${a.agent.name} [${a.agent.division}] trust:${a.trustScore.toFixed(3)}`));
  console.log(`Prompt: ${opts.prompt.slice(0, 80)}...`);

  if (opts.dryRun) { console.log('DRY RUN'); await db.$disconnect(); return; }

  // === NAMING PHASE ===
  const waveIdentity = await generateWaveIdentity(db, agents, opts.type, opts.prompt);
  
  const results = [];
  const startTime = Date.now();

  // Create wave WITH identity
  const lastWave = await db.wave.findFirst({ where: { projectId: opts.project }, orderBy: { number: 'desc' } });
  const waveNumber = (lastWave?.number || 0) + 1;
  const wave = await db.wave.create({
    data: {
      projectId: opts.project,
      number: waveNumber,
      type: opts.type,
      status: 'running',
      prompt: opts.prompt,
      name: waveIdentity.name,
      emoji: waveIdentity.emoji,
      personality: waveIdentity.personality,
    },
  });

  console.log(`\n=== ${waveIdentity.emoji} "${waveIdentity.name}" (#${waveNumber}) ===`);

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
          content: `[${waveIdentity.name}] #${waveNumber}: ${llm.content.slice(0, 250)}`,
          tags: `${opts.type},wave${waveNumber},${waveIdentity.name}`, importance: Math.min(1, llm.confidence * 0.8),
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

  console.log(`\n=== ${waveIdentity.emoji} "${waveIdentity.name}" COMPLETE in ${total}s ===`);
  console.log(`#${waveNumber} | ${opts.type} | Agents: ${results.length} | Avg Conf: ${avgConf.toFixed(3)}`);
  console.log(`Moods: ${Object.entries(moods).map(([m, c]) => `${m}(${c})`).join(', ')}`);

  const output = {
    waveId: wave.id, waveNumber, type: opts.type, prompt: opts.prompt, projectId: opts.project,
    waveName: waveIdentity.name, waveEmoji: waveIdentity.emoji, wavePersonality: waveIdentity.personality,
    totalElapsed: parseFloat(total), avgConfidence: avgConf, moodBreakdown: moods, responses: results,
  };
  fs.writeFileSync(opts.save, JSON.stringify(output, null, 2));
  console.log(`Saved: ${opts.save}`);

  await db.$disconnect();
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
