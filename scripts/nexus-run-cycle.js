#!/usr/bin/env node
/**
 * NEXUS Auto-Mejora — One-Shot Cycle Runner
 * =========================================
 * Runs a complete auto-mejora cycle: all tasks in sequence.
 * No background process — just runs and exits.
 *
 * Usage:
 *   node scripts/nexus-run-cycle.js           # Full cycle
 *   node scripts/nexus-run-cycle.js --single  # Next pending task only
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const TASK_LIST_PATH = '/home/z/my-project/task-list.json';
const LOG_FILE = '/home/z/my-project/download/nexus-cycle.log';
const RUN_DIR = '/home/z/my-project';
const MAX_FAIL = 3;
const MAX_CYCLES_PER_DAY = 8;

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try { fs.appendFileSync(LOG_FILE, line + '\n'); } catch {}
}

function loadTaskList() { return JSON.parse(fs.readFileSync(TASK_LIST_PATH, 'utf8')); }
function saveTaskList(data) { fs.writeFileSync(TASK_LIST_PATH, JSON.stringify(data, null, 2)); }

function getNextPendingTask(data) {
  for (const task of data.tasks) {
    if (task.status === 'pending') {
      if (task.dependsOn) {
        const dep = data.tasks.find(t => t.id === task.dependsOn);
        if (dep && dep.status !== 'completed') continue;
      }
      return task;
    }
  }
  return null;
}

function resetCycle(data) {
  data.cycle = (data.cycle || 0) + 1;
  data.cyclesCompletedToday = (data.cyclesCompletedToday || 0) + 1;
  for (const task of data.tasks) {
    task.status = 'pending';
    task.lastRun = null;
    task.failCount = 0;
    if (task.command) task.command = task.command.replace(/CYCLE/g, String(data.cycle));
  }
}

function spawnCmd(cmd, timeoutMs = 300000) {
  return new Promise((resolve, reject) => {
    const child = spawn('bash', ['-c', cmd], {
      cwd: RUN_DIR,
      env: { ...process.env, NEXUS_DELAY: process.env.NEXUS_DELAY || '5000' },
      stdio: ['pipe', 'pipe', 'pipe']
    });
    let stdout = '', stderr = '';
    const timer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('Timeout')); }, timeoutMs);
    child.stdout.on('data', d => { stdout += d; });
    child.stderr.on('data', d => { stderr += d; });
    child.on('close', code => {
      clearTimeout(timer);
      code === 0 ? resolve(stdout) : reject(new Error(`Exit ${code}: ${stderr.slice(-300)}`));
    });
    child.on('error', err => { clearTimeout(timer); reject(err); });
    child.stdin.resume();
  });
}

async function runTask(data, task) {
  const cmd = task.command;
  if (!cmd) { task.status = 'completed'; return true; }
  log(`  ${task.id}: ${task.name}`);
  task.status = 'running';
  saveTaskList(data);
  try {
    const start = Date.now();
    const output = await spawnCmd(cmd, 300000);
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    log(`  OK (${elapsed}s)`);
    (output || '').trim().split('\n').slice(-3).forEach(l => log(`    > ${l}`));
    task.status = 'completed';
    task.failCount = 0;
    return true;
  } catch (err) {
    log(`  FAIL: ${err.message.slice(0, 200)}`);
    task.failCount = (task.failCount || 0) + 1;
    if (task.failCount >= MAX_FAIL) { task.status = 'completed'; }
    else { task.status = 'pending'; }
    return false;
  }
}

async function main() {
  const singleMode = process.argv.includes('--single');
  log(`NEXUS Cycle Runner | ${singleMode ? 'single' : 'full'} | PID: ${process.pid}`);

  // Health check
  try { await spawnCmd(`cd ${RUN_DIR} && node scripts/nexus-harness.js --status`, 30000); }
  catch { log('Health check FAIL'); process.exit(1); }

  let data = loadTaskList();
  const today = new Date().toISOString().split('T')[0];
  if (data.lastResetDate !== today) { data.cyclesCompletedToday = 0; data.lastResetDate = today; }
  if ((data.cyclesCompletedToday || 0) >= MAX_CYCLES_PER_DAY) { log('Daily cap reached'); process.exit(0); }

  let tasksRun = 0, successes = 0;
  const startTime = Date.now();

  while (true) {
    data = loadTaskList();
    const task = getNextPendingTask(data);
    if (!task) { resetCycle(data); saveTaskList(data); break; }
    const ok = await runTask(data, task);
    tasksRun++; if (ok) successes++;
    saveTaskList(data);
    if (singleMode) break;
    if (getNextPendingTask(loadTaskList())) {
      log('  Pausing 10s...');
      await new Promise(r => setTimeout(r, 10000));
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  log(`Cycle done: ${successes}/${tasksRun} OK in ${elapsed}s | Cycle #${data.cycle} | Daily: ${data.cyclesCompletedToday}/${MAX_CYCLES_PER_DAY}`);
}

main().catch(e => { log(`Fatal: ${e.message}`); process.exit(1); });
