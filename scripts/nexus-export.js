#!/usr/bin/env node
/**
 * NEXUS Export — Exporta DB SQLite a JSON
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DB_PATH = '/home/z/my-project/db/custom.db';
const OUTPUT = '/home/z/my-project/download/nexus-export.json';

function exportTable(tableName) {
  try {
    const data = execSync(`sqlite3 -json "${DB_PATH}" "SELECT * FROM ${tableName}"`, { encoding: 'utf8' });
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function main() {
  console.log('=== NEXUS DB Export ===\n');

  const tables = ['Project', 'Agent', 'Wave', 'WaveResponse', 'AgentMemory', 'AgentSkill', 'SystemLog'];

  const exportData = {
    exportedAt: new Date().toISOString(),
    tables: {}
  };

  for (const table of tables) {
    try {
      const rows = exportTable(table);
      exportData.tables[table] = { count: rows.length, data: rows };
      console.log(`  ${table}: ${rows.length} rows`);
    } catch (e) {
      console.log(`  ${table}: SKIPPED (${e.message.slice(0, 50)})`);
    }
  }

  fs.writeFileSync(OUTPUT, JSON.stringify(exportData, null, 2));
  console.log(`\nExported to: ${OUTPUT} (${(fs.statSync(OUTPUT).size / 1024).toFixed(1)} KB)`);
}

main();
