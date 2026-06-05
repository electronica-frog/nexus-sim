#!/bin/bash
cd /home/z/my-project
while true; do
  if ! ss -tlnp | grep -q ":3000 "; then
    echo "$(date): Restarting next..." >> /tmp/watchdog.log
    npx next start -p 3000 >> /tmp/next-server.log 2>&1 &
    disown
    sleep 4
  fi
  sleep 2
done
