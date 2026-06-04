#!/bin/bash
cd /home/z/my-project
echo "$(date): NEXUS Sim server starting..."
while true; do
  NODE_OPTIONS="--max-old-space-size=256" node ./node_modules/.bin/next start -p 3000 2>&1
  EXIT=$?
  echo "$(date): Server exited with code $EXIT. Restarting in 5s..."
  sleep 5
done
