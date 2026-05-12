#!/bin/bash
# USRA PLUS Server Supervisor - Keeps the production server alive
# Restarts the server if it dies, with exponential backoff

LOG="/tmp/server.log"
DIR="/home/z/my-project"
MAX_BACKOFF=30
BACKOFF=1

echo "[supervisor] Starting USRA PLUS server supervisor..."

while true; do
  echo "[supervisor] $(date) Starting next server..." >> "$LOG"
  cd "$DIR"
  npx next start -p 3000 >> "$LOG" 2>&1
  EXIT_CODE=$?
  echo "[supervisor] $(date) Server exited with code $EXIT_CODE" >> "$LOG"
  
  # Exponential backoff on crashes
  sleep "$BACKOFF"
  if [ "$BACKOFF" -lt "$MAX_BACKOFF" ]; then
    BACKOFF=$((BACKOFF * 2))
  fi
  
  # Reset backoff if server ran for more than 60 seconds
  # (indicates a clean restart, not a crash loop)
done
