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
  status: false, skipNaming: false,
  waveName: '', waveEmoji: '🌊', wavePersonality: ''
};
for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--agents': opts.agents = parseInt(args[++i]); break;
    case '--type': opts.type = args[++i]; break;
    case '--prompt': {
      const promptParts = [];
      i++;
      while (i < args.length && !args[i].startsWith('--')) {
        promptParts.push(args[i]);
        i++;
      }
      opts.prompt = promptParts.join(' ');
      i--;
      break;
    }
    case '--project': opts.project = args[++i]; break;
    case '--division': opts.division = args[++i]; break;
    case '--dry-run': opts.dryRun = true; break;
    case '--save': opts.save = args[++i]; break;
    case '--status': opts.status = true; break;
    case '--skip-naming': opts.skipNaming = true; break;
    case '--wave-name': opts.waveName = args[++i]; break;
    case '--wave-emoji': opts.waveEmoji = args[++i]; break;
    case '--wave-personality': opts.wavePersonality = args[++i]; break;
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

// Rate limit protection: delay between LLM calls
const DELAY_MS = process.env.NEXUS_DELAY ? parseInt(process.env.NEXUS_DELAY) : 5000; // 5s default, configurable
const delay = ms => new Promise(r => setTimeout(r, ms));

/**
 * PERSONALITY → BEHAVIOR ENGINE
 * Parses wave personality string and returns temperature modifier + behavior prompt.
 * This makes wave identity affect REAL agent behavior, not just cosmetics.
 *
 * Personality keywords map to:
 *   - High creativity: explosive, visionaria, fluida, salvaje, caótica, imaginativa → temp +0.15
 *   - Low creativity (precise): precisa, escéptica, rigurosa, analítica, meticulosa → temp -0.15
 *   - Aggressive tone: audaz, disruptiva, radical, intensa → push agents to challenge norms
 *   - Collaborative tone: curiosa, constructiva, empática, abierta → push agents to build on others
 *   - Reflective tone: contemplativa, profunda, filosófica → push agents to think deeper
 */
const PERSONALITY_MODIFIERS = {
  // Temperature boosters (creative/chaotic)
  explosive:   { tempDelta: 0.15, behavior: 'Sé atrevido, expande los límites, no te contengas.' },
  visionaria:  { tempDelta: 0.12, behavior: 'Piensa en grande, visualiza el futuro, conecta ideas que otros no ven.' },
  fluida:      { tempDelta: 0.10, behavior: 'Deja fluir tu pensamiento, conecta conceptos de forma orgánica.' },
  salvaje:     { tempDelta: 0.18, behavior: 'Rompe las reglas, propón lo inesperado,挑战 lo establecido.' },
  caótica:     { tempDelta: 0.20, behavior: 'Embrace the chaos, genera ideas dispersas e inesperadas.' },
  imaginativa: { tempDelta: 0.12, behavior: 'Usa metáforas, analogías y pensamiento lateral.' },
  innovadora:  { tempDelta: 0.10, behavior: 'Busca soluciones novedosas, piensa fuera de la caja.' },
  creativa:    { tempDelta: 0.10, behavior: 'Genera ideas originales, evita lo obvio.' },
  apasionada:  { tempDelta: 0.08, behavior: 'Expresa tu entusiasmo, defiende tus ideas con pasión.' },
  // Temperature reducers (precise/rigorous)
  precisa:     { tempDelta: -0.15, behavior: 'Sé meticuloso, cada palabra debe contar. No divagues.' },
  escéptica:   { tempDelta: -0.12, behavior: 'Cuestiona todo, busca contra-argumentos, sé el devil\'s advocate.' },
  rigurosa:    { tempDelta: -0.15, behavior: 'Usa datos y lógica. fundamenta cada afirmación.' },
  analítica:   { tempDelta: -0.12, behavior: 'Descompone el problema en partes, analiza cada una.' },
  meticulosa:  { tempDelta: -0.15, behavior: 'Presta atención al detalle, no dejes cabos sueltos.' },
  incisiva:    { tempDelta: -0.10, behavior: 'Ve directo al grano, identifica el núcleo del problema.' },
  perceptiva:  { tempDelta: -0.08, behavior: 'Observa patrones que otros pasan por alto, lee entre líneas.' },
  // Behavior modifiers (tone/attitude)
  audaz:       { tempDelta: 0.05, behavior: 'Toma posiciones fuertes, no te quedes en el medio.' },
  disruptiva:  { tempDelta: 0.10, behavior: 'Desafía el status quo, propone alternativas radicales.' },
  radical:     { tempDelta: 0.10, behavior: 'Ve a las raíces del problema, no parches superficiales.' },
  intensa:     { tempDelta: 0.05, behavior: 'Sé conciso y contundente, cada oración debe impactar.' },
  curiosa:     { tempDelta: 0.05, behavior: 'Haz preguntas, explora ángulos que no se han considerado.' },
  constructiva:{ tempDelta: 0.00, behavior: 'Construye sobre las ideas de otros, mejora en lugar de destruir.' },
  empática:    { tempDelta: 0.00, behavior: 'Considera todas las perspectivas, busca el punto de encuentro.' },
  abierta:     { tempDelta: 0.05, behavior: 'Explora sin prejuicios, considera todas las opciones.' },
  contemplativa:{ tempDelta: -0.05, behavior: 'Reflexiona antes de responder, busca la sabiduría en la profundidad.' },
  profunda:    { tempDelta: -0.05, behavior: 'No te quedes en la superficie, profundiza en las implicaciones.' },
  transformadora:{ tempDelta: 0.08, behavior: 'Busca cómo transformar el presente en algo radicalmente mejor.' },
  rebelde:     { tempDelta: 0.15, behavior: 'Desafía las convenciones, cuestiona lo que todos dan por sentado.' },
  inspiradora:  { tempDelta: 0.10, behavior: 'Motiva y eleva la conversación, busca el efecto wow.' },
  valiente:    { tempDelta: 0.10, behavior: 'No temas proponer lo impopular si crees que es correcto.' },
  provocadora: { tempDelta: 0.15, behavior: 'Provoca reacciones, desafía suposiciones, genera tensión creativa.' },
  estratégica: { tempDelta: -0.05, behavior: 'Piensa a largo plazo, considera consecuencias e implicaciones.' },
  pragmática:  { tempDelta: -0.08, behavior: 'Enfócate en lo actionable, prioriza impacto sobre teoría.' },
  osada:       { tempDelta: 0.12, behavior: 'Atrévete a proponer lo que nadie más se atrevería.' },
  desafiante:  { tempDelta: 0.12, behavior: 'Reta al grupo, no aceptes la respuesta fácil.' },
  luminosa:    { tempDelta: 0.08, behavior: 'Busca iluminar el problema desde ángulos nuevos e inesperados.' },
  introspectiva:{ tempDelta: -0.10, behavior: 'Mira hacia adentro, analiza tus propias suposiciones antes de responder.' },
  crítica:     { tempDelta: -0.10, behavior: 'Evalúa con ojo crítico, no te conformes con la primera respuesta.' },
  juguetona:   { tempDelta: 0.12, behavior: 'Diviértete, experimenta, no temas proponer cosas locas.' },
  tenaz:       { tempDelta: 0.00, behavior: 'Persigue tu punto hasta el final, no te rindas fácilmente.' },
  vigilante:   { tempDelta: -0.08, behavior: 'Mantente alerta a errores, inconsistencias y riesgos.' },
};

function computePersonalityEffects(personalityStr, waveType) {
  const lower = personalityStr.toLowerCase();
  let totalTempDelta = 0;
  const behaviors = [];

  for (const [keyword, mod] of Object.entries(PERSONALITY_MODIFIERS)) {
    if (lower.includes(keyword)) {
      totalTempDelta += mod.tempDelta;
      behaviors.push(mod.behavior);
    }
  }

  // Clamp temperature to valid range [0.1, 1.0] (some APIs reject > 1.0)
  const baseTemp = WAVE_TEMPS[waveType] ?? 0.7;
  const finalTemp = Math.max(0.1, Math.min(1.0, baseTemp + totalTempDelta));

  return {
    temperature: finalTemp,
    tempDelta: totalTempDelta,
    baseTemp,
    behaviorPrompt: behaviors.length > 0
      ? `## Comportamiento de esta Oleada\n${behaviors.join('\\n')}`
      : '',
    matchedTraits: behaviors.length,
  };
}

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

async function callLLM(agent, waveType, prompt, memories, personalityEffects) {
  const zai = await ZAI.create();
  const parts = [
    `Eres ${agent.emoji} **${agent.name}**, actuando dentro del sistema NEXUS.`,
    '', `## Tu Personalidad`, agent.personality.slice(0, 1500), '',
    `## Contexto de la Oleada`, WAVE_CONTEXT[waveType] || '',
  ];
  // Inject wave personality behavior modifier
  if (personalityEffects && personalityEffects.behaviorPrompt) {
    parts.push('', personalityEffects.behaviorPrompt);
  }
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
    temperature: personalityEffects ? personalityEffects.temperature : (WAVE_TEMPS[waveType] ?? 0.7),
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
  
  for (let ni = 0; ni < namers.length; ni++) {
    const pa = namers[ni];
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
    if (ni < namers.length - 1) await delay(DELAY_MS); // Rate limit protection
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

  // Select agents — prioritize DIVISION DIVERSITY over raw trust score
  // Ensures waves aren't dominated by a single division
  const divisions = opts.division ? [opts.division] : (DIVISION_MAP[opts.type] || []);
  
  let agents;
  if (opts.division) {
    // Specific division requested — use trust ordering
    agents = await db.projectAgent.findMany({
      where: { projectId: opts.project, agent: { division: { in: divisions } } },
      include: { agent: true },
      orderBy: { trustScore: 'desc' },
      take: opts.agents,
    });
  } else {
    // DIVERSITY MODE: pick top agents from DIFFERENT divisions first
    const allCandidates = await db.projectAgent.findMany({
      where: { projectId: opts.project, agent: { division: { in: divisions } } },
      include: { agent: true },
      orderBy: { trustScore: 'desc' },
    });
    
    // Group by division
    const byDiv = {};
    allCandidates.forEach(pa => {
      const div = pa.agent.division;
      if (!byDiv[div]) byDiv[div] = [];
      byDiv[div].push(pa);
    });
    
    // Round-robin pick from each division
    agents = [];
    const divKeys = Object.keys(byDiv).sort();
    let round = 0;
    while (agents.length < opts.agents && round < 20) {
      for (const div of divKeys) {
        if (agents.length >= opts.agents) break;
        if (byDiv[div].length > round) {
          agents.push(byDiv[div][round]);
        }
      }
      round++;
    }
  }

  console.log(`=== NEXUS HARNESS v2 ===`);
  console.log(`Type: ${opts.type} | Agents: ${agents.length}`);
  agents.forEach(a => console.log(`  ${a.agent.emoji} ${a.agent.name} [${a.agent.division}] trust:${a.trustScore.toFixed(3)}`));
  console.log(`Prompt: ${opts.prompt.slice(0, 80)}...`);

  if (opts.dryRun) { console.log('DRY RUN'); await db.$disconnect(); return; }

  // === NAMING PHASE ===
  let waveIdentity;
  if (opts.skipNaming) {
    waveIdentity = {
      name: opts.waveName || `Oleada ${opts.type}`,
      emoji: opts.waveEmoji || '🌊',
      personality: opts.wavePersonality || 'adaptable',
    };
    console.log(`\n🎭 SKIP NAMING — Using provided identity: "${waveIdentity.emoji} ${waveIdentity.name}" (${waveIdentity.personality})`);
  } else {
    waveIdentity = await generateWaveIdentity(db, agents, opts.type, opts.prompt);
  }
  
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

  // === COMPUTE PERSONALITY EFFECTS ===
  const personalityEffects = computePersonalityEffects(waveIdentity.personality, opts.type);
  if (personalityEffects.tempDelta !== 0) {
    console.log(`  🎭 Personalidad «${waveIdentity.personality}» → temp ${personalityEffects.baseTemp} → ${personalityEffects.temperature.toFixed(2)} (${personalityEffects.tempDelta > 0 ? '+' : ''}${personalityEffects.tempDelta.toFixed(2)}) | ${personalityEffects.matchedTraits} traits matched`);
  } else {
    console.log(`  🎭 Personalidad «${waveIdentity.personality}» → sin modificadores reconocidos (temp ${personalityEffects.temperature.toFixed(2)})`);
  }

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
      const llm = await callLLM(agent, opts.type, opts.prompt, memories.map(m => `[${m.type}]: ${m.content.slice(0, 150)}`), personalityEffects);
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

      // === SKILL USAGE TRACKING ===
      // Track which skills were "used" by incrementing timesUsed for agent's top skills
      // This doesn't require an extra LLM call — it's automatic based on wave participation
      const agentSkills = await db.agentSkill.findMany({
        where: { projectId: opts.project, agentId: agent.id },
        orderBy: { quality: 'desc' },
        take: 3, // top 3 skills most likely used
      });
      if (agentSkills.length > 0) {
        const skillIds = agentSkills.map(s => s.id);
        await db.agentSkill.updateMany({
          where: { id: { in: skillIds } },
          data: { timesUsed: { increment: 1 } },
        });
        // Update quality based on wave confidence (simple: if agent was confident, skills helped)
        if (llm.confidence > 0.7) {
          await db.agentSkill.updateMany({
            where: { id: { in: skillIds } },
            data: { quality: { increment: 0.01 } }, // small quality bump
          });
        }
      }

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
    if (i < agents.length - 1) await delay(DELAY_MS); // Rate limit protection
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
    personalityEffects: { temperature: personalityEffects.temperature, tempDelta: personalityEffects.tempDelta, matchedTraits: personalityEffects.matchedTraits },
    totalElapsed: parseFloat(total), avgConfidence: avgConf, moodBreakdown: moods, responses: results,
  };
  fs.writeFileSync(opts.save, JSON.stringify(output, null, 2));
  console.log(`Saved: ${opts.save}`);

  await db.$disconnect();
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
