#!/bin/bash
# NEXUS Sync — Push to GitHub
# Commits nexus data and pushes to nexus-sim repo

set -e

cd /home/z/my-project

# Configure git
git config user.name "electronica-frog" 2>/dev/null
git config user.email "bautiarmanielectronica@gmail.com" 2>/dev/null

# Check if there's a remote
if ! git remote get-url origin 2>/dev/null; then
  git remote add origin git@github.com:electronica-frog/nexus-sim.git 2>/dev/null || true
fi

# Check for changes
if git diff --quiet && git diff --cached --quiet; then
  echo "[SYNC] No changes to push"
  exit 0
fi

# Add key files
git add -f db/custom.db download/nexus-export.json download/wave-results.json download/priority-scores.json download/ralph-loop/ task-list.json 2>/dev/null || true
git add -f skills/nexus/SKILL.md skills/nexus-auto/SKILL.md scripts/nexus-*.js 2>/dev/null || true

# Commit
TIMESTAMP=$(date '+%Y-%m-%d %H:%M')
git commit -m "sync: nexus data ${TIMESTAMP}" --allow-empty 2>/dev/null || true

# Push
git push origin main 2>/dev/null && \
  echo "[SYNC] Push successful — Vercel will auto-deploy" || \
  echo "[SYNC] Push failed"

echo "=== NEXUS SYNC END ==="
