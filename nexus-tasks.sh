#!/bin/bash
# NEXUS Auto-Loop — Unified task runner (z-owned copy)
set -euo pipefail

TASK_LIST="/home/z/my-project/task-list.json"
LOCK_FILE="/tmp/nexus-loop.lock"
LOG_FILE="/home/z/my-project/skills/nexus-auto-mejora/loop.log"
DOWNLOAD_DIR="/home/z/my-project/download"
MAX_FAIL=3
RUN_DIR="/home/z/my-project"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }

acquire_lock() {
  if [ -f "$LOCK_FILE" ]; then
    local pid age
    pid=$(cat "$LOCK_FILE" 2>/dev/null || echo "0")
    age=$(( $(date +%s) - $(stat -c %Y "$LOCK_FILE" 2>/dev/null || echo "0") ))
    if kill -0 "$pid" 2>/dev/null && [ "$age" -lt 600 ]; then
      log "LOCK: Another instance running (pid=$pid, age=${age}s). Exiting."
      exit 0
    fi
    log "LOCK: Stale lock found (pid=$pid, age=${age}s). Removing."
    rm -f "$LOCK_FILE"
  fi
  echo $$ > "$LOCK_FILE"
  log "LOCK: Acquired (pid=$$)"
}
release_lock() { rm -f "$LOCK_FILE"; log "LOCK: Released"; }
trap release_lock EXIT

mark_task_status() {
  python3 -c "
import json, sys, datetime as dt
tid, st, p = sys.argv[1], sys.argv[2], sys.argv[3]
with open(p) as f: data = json.load(f)
for t in data['tasks']:
    if t['id'] == tid:
        t['status'] = st
        t['lastRun'] = dt.datetime.now(dt.UTC).isoformat().replace('+00:00','Z')
        if st == 'completed': t['failCount'] = 0
        break
with open(p, 'w') as f: json.dump(data, f, indent=2)
" "$1" "$2" "$TASK_LIST"
}

increment_fail() {
  python3 -c "
import json, sys
tid, p = sys.argv[1], sys.argv[2]
with open(p) as f: data = json.load(f)
for t in data['tasks']:
    if t['id'] == tid: t['failCount'] = t.get('failCount',0)+1; break
with open(p, 'w') as f: json.dump(data, f, indent=2)
" "$1" "$TASK_LIST"
}

get_next_task() {
  python3 -c "
import json, sys
with open('$TASK_LIST') as f: data = json.load(f)
for t in data['tasks']:
    if t['status'] == 'pending':
        dep = t.get('dependsOn')
        if dep:
            dt2 = next((x for x in data['tasks'] if x['id']==dep), None)
            if dt2 and dt2['status'] != 'completed': continue
        print(t['id']); sys.exit(0)
print('NONE')
"
}

get_cycle() { python3 -c "print(json.load(open('$TASK_LIST'))['cycle'])"; }

reset_cycle() {
  python3 -c "
import json, datetime as dt
p='$TASK_LIST'
with open(p) as f: data=json.load(f)
data['cycle']=data.get('cycle',0)+1
data['cyclesCompletedToday']=data.get('cyclesCompletedToday',0)+1
c=data['cycle']
for t in data['tasks']:
    t['status']='pending'; t['lastRun']=None; t['failCount']=0
    if 'command' in t: t['command']=t['command'].replace(str(c-1),str(c))
with open(p,'w') as f: json.dump(data,f,indent=2)
print(f'Cycle advanced to {c}')
"
}

check_daily_cap() {
  python3 -c "
import json, datetime
with open('$TASK_LIST') as f: data=json.load(f)
today=datetime.date.today().isoformat()
if data.get('lastResetDate','')!=today:
    data['cyclesCompletedToday']=0; data['lastResetDate']=today
    with open('$TASK_LIST','w') as f: json.dump(data,f,indent=2)
d=data.get('cyclesCompletedToday',0); c=data.get('maxCyclesPerDay',8)
print(f'{d}/{c}')
"
}

health_check() {
  local ok=true
  [ ! -f "$RUN_DIR/db/custom.db" ] && { log "HEALTH: DB missing!"; ok=false; }
  [ ! -f "$RUN_DIR/scripts/nexus-harness.js" ] && { log "HEALTH: Harness missing!"; ok=false; }
  if ! node "$RUN_DIR/scripts/nexus-harness.js" --status >/dev/null 2>&1; then
    log "HEALTH: DB query failed!"; ok=false
  fi
  $ok && { log "HEALTH: OK"; return 0; } || { log "HEALTH: FAIL"; return 1; }
}

main() {
  log "=== NEXUS AUTO-LOOP START ==="
  acquire_lock
  if ! health_check; then log "=== END (health) ==="; exit 1; fi

  local cap_status; cap_status=$(check_daily_cap)
  log "Daily cap: $cap_status"
  local done_c max_c
  done_c=$(echo "$cap_status" | cut -d/ -f1)
  max_c=$(echo "$cap_status" | cut -d/ -f2)
  [ "$done_c" -ge "$max_c" ] && { log "Cap reached. END"; exit 0; }

  local task_id; task_id=$(get_next_task)
  if [ "$task_id" = "NONE" ]; then
    log "Cycle $(get_cycle) done. Resetting..."; reset_cycle
    log "=== END (reset) ==="; exit 0
  fi

  local cmd
  cmd=$(python3 -c "
import json
with open('$TASK_LIST') as f: data=json.load(f)
for t in data['tasks']:
    if t['id']=='$task_id': print(t.get('command','')); break
")

  [ -z "$cmd" ] && { mark_task_status "$task_id" "completed"; exit 0; }

  local fc
  fc=$(python3 -c "
import json
with open('$TASK_LIST') as f: data=json.load(f)
for t in data['tasks']:
    if t['id']=='$task_id': print(t.get('failCount',0)); break
")
  [ "$fc" -ge "$MAX_FAIL" ] && { log "$task_id hit $MAX_FAIL fails. Skip."; mark_task_status "$task_id" "completed"; exit 0; }

  log "RUN: $task_id"
  log "CMD: ${cmd:0:150}..."
  mark_task_status "$task_id" "running"

  local output; set +e
  output=$(eval "$cmd" 2>&1)
  local ec=$?; set -e

  if [ $ec -eq 0 ]; then
    log "OK: $task_id"
    echo "$output" | tail -5 | while IFS= read -r line; do log "  > $line"; done
    mark_task_status "$task_id" "completed"
    local nc; nc=$(get_next_task)
    [ "$nc" = "NONE" ] && { log "Cycle done! Reset..."; reset_cycle; }
  else
    log "FAIL: $task_id (exit=$ec)"
    echo "$output" | tail -5 | while IFS= read -r line; do log "  > $line"; done
    increment_fail "$task_id"
    mark_task_status "$task_id" "pending"
  fi
  log "=== NEXUS AUTO-LOOP END ==="
}

main "$@"
