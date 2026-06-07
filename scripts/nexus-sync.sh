#!/bin/bash
# NEXUS Sync — Export DB to JSON + git push to GitHub
# This is what the cron job triggers: export → commit → push
# Vercel auto-deploys on push, so the dashboard updates automatically.

set -euo pipefail

RUN_DIR="/home/z/my-project"
DATA_DIR="$RUN_DIR/public/nexus-data"
LOG_FILE="$RUN_DIR/skills/nexus-auto-mejora/sync.log"
LOCK_FILE="/tmp/nexus-sync.lock"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }

# --- Lock (prevent concurrent syncs) ---
if [ -f "$LOCK_FILE" ]; then
  pid=$(cat "$LOCK_FILE" 2>/dev/null || echo "0")
  age=$(( $(date +%s) - $(stat -c %Y "$LOCK_FILE" 2>/dev/null || echo "0") ))
  if kill -0 "$pid" 2>/dev/null && [ "$age" -lt 120 ]; then
    log "SYNC: Another sync running (pid=$pid, age=${age}s). Exiting."
    exit 0
  fi
  rm -f "$LOCK_FILE"
fi
echo $$ > "$LOCK_FILE"
trap "rm -f $LOCK_FILE" EXIT

log "=== NEXUS SYNC START ==="

# 1. Export DB → JSON
log "Exporting DB to JSON..."
cd "$RUN_DIR"
node scripts/nexus-export.js 2>&1 | tail -5 | while read line; do log "  $line"; done

if [ ! -f "$DATA_DIR/health.json" ]; then
  log "SYNC: Export failed — health.json not found"
  exit 1
fi

# 2. Git add, commit, push
log "Adding files to git..."
cd "$RUN_DIR"

# Add nexus-data directory
git add public/nexus-data/ 2>/dev/null || true

# Add download reports if they exist
git add download/nexus-report-*.json download/nexus-cycle-*.json 2>/dev/null || true

# Check if there's anything to commit
if git diff --cached --quiet; then
  log "SYNC: No changes to commit"
  log "=== NEXUS SYNC END (no changes) ==="
  exit 0
fi

COMMIT_MSG="sync: nexus data $(date -u '+%Y-%m-%d %H:%M') — $(node -e "const h=require('./public/nexus-data/health.json'); console.log('health:'+h.healthScore+'/100 waves:'+h.totals.waves+' agents:'+h.totals.agents)")"

log "Committing: $COMMIT_MSG"
git commit -m "$COMMIT_MSG" 2>&1 | tail -3 | while read line; do log "  $line"; done

log "Pushing to remote..."
git push 2>&1 | tail -3 | while read line; do log "  $line"; done

if [ $? -eq 0 ]; then
  log "SYNC: Push successful — Vercel will auto-deploy"
else
  log "SYNC: Push failed — will retry next cycle"
fi

log "=== NEXUS SYNC END ==="
