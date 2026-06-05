#!/bin/bash
# NEXUS Sim v2 — Production Startup Script
# Handles: clean startup, auto-restart, health checks, graceful shutdown
set -euo pipefail

PORT="${PORT:-3000}"
LOG_FILE="/tmp/nexus-server.log"
HEALTH_URL="http://localhost:${PORT}/"
MAX_RESTARTS=5
RESTART_COUNT=0
RESTART_DELAY=3

cleanup() {
  echo "[$(date)] Shutting down NEXUS server..."
  kill "$SERVER_PID" 2>/dev/null || true
  wait "$SERVER_PID" 2>/dev/null || true
  echo "[$(date)] Server stopped."
  exit 0
}

trap cleanup SIGTERM SIGINT

# Kill any existing instances
pkill -f "next-server" 2>/dev/null || true
pkill -f "server.mjs" 2>/dev/null || true
pkill -f "next start" 2>/dev/null || true
sleep 1

echo "[$(date)] Starting NEXUS Sim v2 on port ${PORT}..."

while [ $RESTART_COUNT -lt $MAX_RESTARTS ]; do
  NODE_OPTIONS="--max-old-space-size=512" \
  npx next start --port "$PORT" -H 0.0.0.0 \
    >> "$LOG_FILE" 2>&1 &
  SERVER_PID=$!

  echo "[$(date)] Server started with PID $SERVER_PID"

  # Wait for server to be ready or fail
  READY=0
  for i in $(seq 1 15); do
    sleep 1
    if ! kill -0 $SERVER_PID 2>/dev/null; then
      echo "[$(date)] Server process died during startup (attempt $((RESTART_COUNT+1))/$MAX_RESTARTS)"
      break
    fi
    if curl -s -o /dev/null -w "%{http_code}" --max-time 2 "$HEALTH_URL" 2>/dev/null | grep -q "200"; then
      READY=1
      echo "[$(date)] Server ready on port ${PORT}"
      break
    fi
  done

  if [ $READY -eq 0 ]; then
    echo "[$(date)] Server failed to start"
    RESTART_COUNT=$((RESTART_COUNT + 1))
    if [ $RESTART_COUNT -lt $MAX_RESTARTS ]; then
      echo "[$(date)] Restarting in ${RESTART_DELAY}s..."
      sleep $RESTART_DELAY
    fi
    continue
  fi

  # Server is running — wait for it to exit
  wait $SERVER_PID 2>/dev/null
  EXIT_CODE=$?
  echo "[$(date)] Server exited with code $EXIT_CODE"

  if [ $EXIT_CODE -eq 0 ]; then
    break
  fi

  RESTART_COUNT=$((RESTART_COUNT + 1))
  if [ $RESTART_COUNT -lt $MAX_RESTARTS ]; then
    echo "[$(date)] Restarting in ${RESTART_DELAY}s (attempt $RESTART_COUNT/$MAX_RESTARTS)..."
    sleep $RESTART_DELAY
  fi
done

if [ $RESTART_COUNT -ge $MAX_RESTARTS ]; then
  echo "[$(date)] Max restarts ($MAX_RESTARTS) reached. Giving up."
  exit 1
fi
