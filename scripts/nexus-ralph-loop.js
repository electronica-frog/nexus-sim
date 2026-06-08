#!/usr/bin/env node
/**
 * NEXUS Ralph Loop — Orquestador de 4 fases
 * PROPONE → EVALÚA → REFLEXIONA → AJUSTA
 *
 * Usage:
 *   node scripts/nexus-ralph-loop.js --prompt "TEMA"
 *   node scripts/nexus-ralph-loop.js --quick --prompt "TEMA"
 */

const { execSync } = require('child_process');
const fs = require('fs');

const RUN_DIR = '/home/z/my-project';
const OUTPUT_DIR = '/home/z/my-project/download/ralph-loop';
const DELAY = parseInt(process.env.NEXUS_DELAY || '5000');

function run(args) {
  const cmd = `cd ${RUN_DIR} && NEXUS_DELAY=${DELAY} node scripts/nexus-harness.js ${args}`;
  console.log(`Running: ${args.substring(0, 100)}...`);
  try {
    const output = execSync(cmd, { timeout: 300000, encoding: 'utf8', cwd: RUN_DIR });
    console.log(output.split('\n').slice(-5).join('\n'));
    return true;
  } catch (err) {
    console.log(`Error: ${err.message?.slice(0, 200)}`);
    return false;
  }
}

function main() {
  const args = process.argv.slice(2);
  const promptIdx = args.indexOf('--prompt');
  if (promptIdx === -1) { console.log('Usage: --prompt "TEMA" [--quick]'); process.exit(1); }
  const prompt = args[promptIdx + 1];
  const quick = args.includes('--quick');
  const skipNaming = quick ? '--skip-naming' : '';
  const phaseDelay = quick ? 5000 : 15000;

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const phases = [
    { name: 'PROPONE', type: 'brainstorm', agents: 4, division: '', emoji: '💡',
      prompt: `PROPONE soluciones para: ${prompt}. Dá propuestas concretas y accionables.` },
    { name: 'EVALÚA', type: 'critique', agents: 4, division: 'testing', emoji: '🔍',
      prompt: `EVALÚA estas propuestas sobre: ${prompt}. Rankea por viabilidad e impacto.` },
    { name: 'REFLEXIONA', type: 'synthesize', agents: 4, division: 'specialized', emoji: '🔄',
      prompt: `REFLEXIONA sobre lo aprendido: ${prompt}. Consolidá insights clave.` },
    { name: 'AJUSTA', type: 'execute', agents: 4, division: 'engineering', emoji: '⚡',
      prompt: `AJUSTÁ el plan basado en las reflexiones: ${prompt}. Dá implementación concreta.` },
  ];

  console.log(`\n=== RALPH LOOP — "${prompt}" ===\n`);

  for (let i = 0; i < phases.length; i++) {
    const p = phases[i];
    console.log(`\n--- Phase ${i + 1}/4: ${p.emoji} ${p.name} ---`);
    const div = p.division ? `--division ${p.division}` : '';
    const save = `--save ${OUTPUT_DIR}/${timestamp}-phase${i + 1}-${p.type}.json`;
    const ok = run(`--type ${p.type} --agents ${p.agents} ${skipNaming} ${div} ${save} --prompt "${p.prompt.replace(/"/g, '\\"')}"`);
    if (!ok && i < phases.length - 1) {
      console.log(`Phase ${p.name} failed, continuing...`);
    }
    if (i < phases.length - 1) {
      console.log(`Waiting ${phaseDelay / 1000}s...`);
      execSync(`sleep ${phaseDelay / 1000}`, { encoding: 'utf8' });
    }
  }

  console.log('\n=== RALPH LOOP COMPLETE ===');
  console.log(`Results in: ${OUTPUT_DIR}/${timestamp}-*.json`);
}

main();
