import { NextRequest, NextResponse } from 'next/server';

/**
 * NEXUS Harness Trigger API
 * POST /api/nexus/harness-trigger
 * Allows external triggers to run NEXUS waves.
 * Results saved to /home/z/my-project/download/nexus-cron-latest.json
 */

const { execSync } = require('child_process');
const fs = require('fs');

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      type = 'brainstorm',
      agents = 3,
      prompt = 'Reflexiona sobre NEXUS y propone una mejora concreta. Nombre, descripcion 2 frases, viabilidad 1-5, impacto 1-5.',
      skipNaming = true,
      project = 'cmpytm3mx004apvrh7r7b18nv',
    } = body;

    const promptArg = prompt.replace(/"/g, '\\"');
    const cmd = `node /home/z/my-project/scripts/nexus-harness.js --type ${type} --agents ${agents} --prompt "${promptArg}" --skip-naming --project ${project} --save /home/z/my-project/download/nexus-cron-latest.json`;

    console.log(`[harness-trigger] Executing: ${cmd}`);

    const startTime = Date.now();
    const output = execSync(cmd, {
      timeout: 300000,
      encoding: 'utf8',
      cwd: '/home/z/my-project',
      env: { ...process.env, NODE_PATH: '/home/z/my-project/.next/standalone/node_modules' },
    });
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    let results = null;
    try {
      results = JSON.parse(fs.readFileSync('/home/z/my-project/download/nexus-cron-latest.json', 'utf8'));
    } catch (e) { /* ignore */ }

    const status = {
      triggeredAt: new Date().toISOString(),
      elapsed: parseFloat(elapsed),
      success: true,
      waveNumber: results?.waveNumber,
      waveName: results?.waveName,
      waveEmoji: results?.waveEmoji,
      agentCount: results?.responses?.length || 0,
      avgConfidence: results?.avgConfidence,
      moodBreakdown: results?.moodBreakdown,
    };

    fs.writeFileSync('/home/z/my-project/download/nexus-cron-status.json', JSON.stringify(status, null, 2));

    return NextResponse.json(status, { status: 200 });
  } catch (err: any) {
    const errorStatus = {
      triggeredAt: new Date().toISOString(),
      success: false,
      error: err.message?.slice(0, 200),
    };
    try {
      fs.writeFileSync('/home/z/my-project/download/nexus-cron-status.json', JSON.stringify(errorStatus, null, 2));
    } catch (e) { /* ignore */ }
    return NextResponse.json(errorStatus, { status: 500 });
  }
}

export async function GET() {
  try {
    const status = JSON.parse(fs.readFileSync('/home/z/my-project/download/nexus-cron-status.json', 'utf8'));
    return NextResponse.json(status);
  } catch {
    return NextResponse.json({ status: 'no_runs_yet' });
  }
}
