#!/bin/bash
# USRA PLUS Server Supervisor - keeps the production server running
cd /home/z/my-project

while true; do
  echo "[$(date)] Starting USRA PLUS production server..."
  NODE_OPTIONS='--max-old-space-size=1024' node node_modules/.bin/next start -p 3000
  EXIT_CODE=$?
  echo "[$(date)] Server exited with code $EXIT_CODE, restarting in 3s..."
  sleep 3
done
