#!/bin/bash
while true; do
  if ! ss -tlnp | grep -q ":3000 "; then
    cd /home/z/my-project
    NODE_ENV=production node --max-old-space-size=192 node_modules/next/dist/bin/next start -p 3000 > /tmp/nexus-server.log 2>&1 &
  fi
  sleep 5
done

