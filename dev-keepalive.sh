#!/bin/bash
# Auto-restart dev server to handle OOM kills
cd /home/z/my-project
while true; do
  echo "[$(date)] Starting dev server..."
  rm -rf .next 2>/dev/null
  bun run dev > dev.log 2>&1
  EXIT_CODE=$?
  echo "[$(date)] Dev server exited with code $EXIT_CODE"
  sleep 3
done
