#!/bin/bash
# Keepalive loop - keeps the dev server alive by pinging it every 10s
while true; do
  curl -s -o /dev/null -w "" http://localhost:3000/ 2>/dev/null
  sleep 10
done
