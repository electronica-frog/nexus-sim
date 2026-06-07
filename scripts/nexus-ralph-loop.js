#!/usr/bin/env node
/**
 * NEXUS Ralph Loop v1 — Self-reflective improvement cycle
 * 
 * Executes 4 waves in sequence:
 *   1. PROPONE  (brainstorm) — Agents propose improvements
 *   2. EVALÚA   (critique)   — Other agents evaluate proposals
 *   3. REFLEXIONA (synthesize) — Consolidate learnings
 *   4. AJUSTA   (execute)    — Generate concrete implementation steps
 *
 * Between phases, the system:
 *   - Scores proposals (viabilidad × impacto × urgencia)
 *   - Saves learnings to agent memories
 *   - Tracks KPIs (time, confidence, mood distribution)
 *   - Creates checkpoints for potential rollback
 *
 * Usage:
 *   node nexus-ralph-loop.js [options]
 *   --topic TEXT     The topic/improvement area to focus on
 *   --agents N       Agents per wave (default: 5)
 *   --project ID     Project ID
 *   --dry-run        Show plan without executing
 *   --save-dir PATH  Where to save results (default: /home/z/my-project/download/ralph-loop/)
 */

process.env.NODE_PATH = '/home/z/my-project/.next/standalone/node_modules';
require('module')._initPaths();

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

// Parse args
const args = process.argv.slice(2);
const opts = {
  topic: 'Mejora general de NEXUS Sim v2: ¿qué feature o mejora tendría más impacto en la utilidad del sistema?',
  agents: 5,
  project: 'cmpytm3mx004apvrh7r7b18nv',
  dryRun: false,
  saveDir: '/home/z/my-project/download/ralph-loop/',
  quick: false, // skip naming to save API calls
};

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--topic': opts.topic = args.slice(++i).join(' '); i = args.length; break;
    case '--agents': opts.agents = parseInt(args[++i]); break;
    case '--project': opts.project = args[++i]; break;
    case '--dry-run': opts.dryRun = true; break;
    case '--save-dir': opts.saveDir = args[++i]; break;
    case '--quick': opts.quick = true; break;
  }
}

const DELAY_MS = 15000; // 15s between waves to avoid rate limits
const delay = ms => new Promise(r => setTimeout(r, ms));

// Harness execution wrapper
function runHarness(waveType, prompt, savePath, extraFlags = '') {
  const quickFlag = opts.quick ? '--skip-naming' : '';
  const cmd = `node /home/z/my-project/scripts/nexus-harness.js --type ${waveType} --agents ${opts.agents} --prompt "${prompt.replace(/"/g, '\\"')}" --save ${savePath} --project ${opts.project} ${extraFlags} ${quickFlag}`;
  console.log(`\n${'='.repeat(60)}`);
  console.log(`$ ${cmd}`);
  console.log('='.repeat(60));
  try {
    const output = execSync(cmd, { timeout: 300000, encoding: 'utf8', stdio: 'inherit' });
    return output;
  } catch (err) {
    console.error(`Harness error (non-fatal): ${err.message}`);
    return null;
  }
}

// ===== RALPH LOOP PHASES =====

const PHASES = [
  {
    name: 'PROPONE',
    type: 'brainstorm',
    description: 'Agents generan propuestas de mejora concretas y accionables',
    promptBuilder: (topic) => `RALPH LOOP — Fase PROPONE.

Analiza NEXUS y propone mejoras sobre: "${topic}"

REGLAS:
- Cada agente propone EXACTAMENTE 1 mejora concreta
- Incluye: título breve, descripción (2-3 frases), viabilidad (1-5), impacto esperado (1-5), urgencia (1-5)
- Score = viabilidad × impacto × urgencia (máx 125)
- Sé específico: NO digas "mejorar X", di "implementar Y con Z parámetros"
- Las propuestas se guardarán y evaluarán en la siguiente fase`,
    outputKey: 'proposals',
  },
  {
    name: 'EVALÚA',
    type: 'critique',
    description: 'Otros agents evalúan las propuestas con scoring rubric',
    promptBuilder: (topic, proposalsSummary) => `RALPH LOOP — Fase EVALÚA.

Las siguientes propuestas fueron generadas para: "${topic}"

PROPUESTAS:
${proposalsSummary}

Evalúa CADA propuesta con:
- Viabilidad técnica (1-5): ¿Se puede implementar con los recursos actuales?
- Impacto esperado (1-5): ¿Cuánto valor agregaría?
- Riesgo (1-5): ¿Qué tan probable es que algo salga mal? (5=muy riesgoso)
- Esfuerzo (1-5): ¿Cuánto trabajo requiere? (5=muy costoso)
- Veredicto: APROBAR / RECHAZAR / NECESITA_MÁS_INFO

Ordena las propuestas por SCORE DESCENDENTE y selecciona el TOP 1 para implementar.`,
    outputKey: 'evaluations',
  },
  {
    name: 'REFLEXIONA',
    type: 'synthesize',
    description: 'Consolida aprendizajes y genera insights para el memory store',
    promptBuilder: (topic, evaluationSummary) => `RALPH LOOP — Fase REFLEXIONA.

Resumen de evaluaciones para: "${topic}"

${evaluationSummary}

TAREA: Como agente reflexivo, genera:
1. TOP 3 aprendizajes de este ciclo (qué funcionó, qué no)
2. Insight principal: una verdad no obvia sobre NEXUS que emerged de este ciclo
3. Recomendación concreta: qué implementar PRIMERO y por qué
4. Métrica de éxito: cómo sabremos si la implementación fue exitosa
5. Qué NO deberíamos hacer (anti-patterns detectados)

Sé conciso pero profundo. Máximo 200 palabras.`,
    outputKey: 'reflections',
  },
  {
    name: 'AJUSTA',
    type: 'execute',
    description: 'Genera pasos de implementación concretos para la propuesta ganadora',
    promptBuilder: (topic, reflectionSummary) => `RALPH LOOP — Fase AJUSTA.

Basado en la reflexión del ciclo para: "${topic}"

${reflectionSummary}

TAREA: Diseña los pasos de implementación EXACTOS para la recomendación principal:
1. Archivos a modificar (paths exactos)
2. Cambios específicos (qué agregar/quitar/modificar)
3. Orden de ejecución (paso 1, 2, 3...)
4. Cómo probar que funciona
5. Checkpoint: qué verificar antes de considerar exitoso
6. Rollback: qué hacer si algo sale mal

Sé ULTRA ESPECÍFICO. Código, SQL, comandos — lo que sea necesario. Máximo 300 palabras.`,
    outputKey: 'adjustments',
  },
];

(async () => {
  const db = new PrismaClient({
    datasources: { db: { url: 'file:/home/z/my-project/db/custom.db' } },
  });

  // Create save directory
  fs.mkdirSync(opts.saveDir, { recursive: true });

  // Get cycle number
  const cycles = await db.systemLog.findMany({
    where: { projectId: opts.project, type: 'ralph_loop_start' },
    orderBy: { createdAt: 'desc' },
    take: 1,
  });
  const cycleNumber = (cycles.length > 0 ? parseInt(cycles[0].message?.match(/\d+/)?.[0] || '0') : 0) + 1;

  const cycleId = `ralph-${cycleNumber}-${Date.now()}`;
  const results = {
    cycleId,
    cycleNumber,
    topic: opts.topic,
    startedAt: new Date().toISOString(),
    phases: [],
  };

  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log(`║  RALPH LOOP #${cycleNumber} — ${opts.topic.slice(0, 45).padEnd(45)}║`);
  console.log('║  Propone → Evalúa → Reflexiona → Ajusta                 ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  // Log cycle start
  await db.systemLog.create({
    data: {
      projectId: opts.project,
      type: 'ralph_loop_start',
      message: `Ralph Loop cycle #${cycleNumber} started`,
      metadata: JSON.stringify({ topic: opts.topic, cycleId }),
    },
  });

  let proposalsSummary = '';
  let evaluationSummary = '';
  let reflectionSummary = '';

  for (let pi = 0; pi < PHASES.length; pi++) {
    const phase = PHASES[pi];
    const savePath = path.join(opts.saveDir, `${phase.outputKey}-${cycleId}.json`);

    console.log(`\n${'─'.repeat(60)}`);
    console.log(`  FASE ${pi + 1}/4: ${phase.name} (${phase.type})`);
    console.log(`  ${phase.description}`);
    console.log('─'.repeat(60));

    if (opts.dryRun) {
      console.log(`  [DRY RUN] Would run: ${phase.type} → ${savePath}`);
      results.phases.push({ name: phase.name, type: phase.type, dryRun: true });
      continue;
    }

    // Build phase-specific prompt
    let prompt;
    switch (phase.name) {
      case 'PROPONE':
        prompt = phase.promptBuilder(opts.topic);
        break;
      case 'EVALÚA':
        prompt = phase.promptBuilder(opts.topic, proposalsSummary);
        break;
      case 'REFLEXIONA':
        prompt = phase.promptBuilder(opts.topic, evaluationSummary);
        break;
      case 'AJUSTA':
        prompt = phase.promptBuilder(opts.topic, reflectionSummary);
        break;
    }

    // Execute wave via harness
    runHarness(phase.type, prompt, savePath);

    // Read results for next phase
    try {
      const waveResults = JSON.parse(fs.readFileSync(savePath, 'utf8'));
      results.phases.push({
        name: phase.name,
        type: phase.type,
        waveId: waveResults.waveId,
        waveNumber: waveResults.waveNumber,
        waveName: waveResults.waveName,
        waveEmoji: waveResults.waveEmoji,
        wavePersonality: waveResults.wavePersonality,
        agentCount: waveResults.responses?.length || 0,
        avgConfidence: waveResults.avgConfidence,
        moodBreakdown: waveResults.moodBreakdown,
        personalityEffects: waveResults.personalityEffects,
      });

      // Build summary for next phase
      const responses = waveResults.responses || [];
      const summary = responses.map((r, idx) =>
        `[${idx + 1}] ${r.agent.emoji} ${r.agent.name} [${r.agent.division}]: ${r.content.slice(0, 400)}`
      ).join('\n\n');

      switch (phase.name) {
        case 'PROPONE':
          proposalsSummary = summary;
          break;
        case 'EVALÚA':
          evaluationSummary = summary;
          break;
        case 'REFLEXIONA':
          reflectionSummary = summary;
          break;
      }

      // Log phase completion
      await db.systemLog.create({
        data: {
          projectId: opts.project,
          type: 'ralph_loop_phase',
          message: `Ralph Loop #${cycleNumber} — ${phase.name} complete (${waveResults.waveEmoji} ${waveResults.waveName})`,
          metadata: JSON.stringify({
            phase: phase.name,
            waveId: waveResults.waveId,
            waveNumber: waveResults.waveNumber,
            waveName: waveResults.waveName,
            agents: waveResults.responses?.length,
            avgConf: waveResults.avgConfidence,
          }),
        },
      });

      // Save learnings to memories for participating agents
      if (phase.name === 'REFLEXIONA' && responses.length > 0) {
        for (const resp of responses) {
          try {
            const agentMatch = await db.agent.findFirst({
              where: { name: resp.agent.name, division: resp.agent.division },
            });
            if (agentMatch) {
              await db.agentMemory.create({
                data: {
                  projectId: opts.project,
                  agentId: agentMatch.id,
                  type: 'insight',
                  content: `[Ralph Loop #${cycleNumber}] Reflexión: ${resp.content.slice(0, 300)}`,
                  tags: `ralph-loop,cycle-${cycleNumber},reflection`,
                  importance: Math.min(1, (resp.confidence || 0.5) * 1.0),
                },
              });
            }
          } catch (memErr) {
            // Non-critical — skip memory save if agent not found
          }
        }
      }

    } catch (readErr) {
      console.error(`  Could not read wave results: ${readErr.message}`);
      results.phases.push({ name: phase.name, type: phase.type, error: readErr.message });
    }

    // Rate limit between phases
    if (pi < PHASES.length - 1) {
      console.log(`\n  ⏳ Waiting ${DELAY_MS / 1000}s between phases...`);
      await delay(DELAY_MS);
    }
  }

  // Save cycle results
  results.completedAt = new Date().toISOString();
  const cycleResultsPath = path.join(opts.saveDir, `cycle-${cycleId}.json`);
  fs.writeFileSync(cycleResultsPath, JSON.stringify(results, null, 2));

  // Log cycle completion
  await db.systemLog.create({
    data: {
      projectId: opts.project,
      type: 'ralph_loop_complete',
      message: `Ralph Loop cycle #${cycleNumber} complete`,
      metadata: JSON.stringify({
        cycleId,
        phases: results.phases.map(p => ({
          name: p.name,
          waveName: p.waveName,
          agents: p.agentCount,
          avgConf: p.avgConfidence,
        })),
      }),
    },
  });

  // Summary
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log(`║  RALPH LOOP #${cycleNumber} COMPLETE                           ║`);
  console.log('╚══════════════════════════════════════════════════════════╝');
  results.phases.forEach((p, i) => {
    if (p.dryRun) {
      console.log(`  ${i + 1}. ${p.name}: [DRY RUN]`);
    } else {
      console.log(`  ${i + 1}. ${p.waveEmoji || '📌'} ${p.name}: ${p.waveName || '?'} (${p.agentCount || '?'} agents, conf: ${p.avgConfidence?.toFixed(2) || '?'})`);
    }
  });
  console.log(`\n  Results: ${cycleResultsPath}`);
  console.log(`  Phases:   ${opts.saveDir}`);

  await db.$disconnect();
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
