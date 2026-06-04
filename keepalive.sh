#!/bin/bash
cd /home/z/my-project

# Start server
NODE_OPTIONS="--max-old-space-size=256" nohup node ./node_modules/.bin/next start -p 3000 > server.log 2>&1 &
SERVER_PID=$!
echo "$(date): Server started PID=$SERVER_PID"

# Keepalive: ping every 2 seconds to prevent idle kill
while kill -0 $SERVER_PID 2>/dev/null; do
  curl -s -o /dev/null -w "" --max-time 5 http://127.0.0.1:3000/ 2>/dev/null
  sleep 2
done

echo "$(date): Server died. Restarting..."
exec "$0"
