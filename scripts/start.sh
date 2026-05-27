#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

# Auto-restart on exit code 42 (used for session refresh)
while true; do
  echo "[Start] $(date) - Starting lab-paper-bot..."
  node src/index.js
  EXIT_CODE=$?

  if [ "$EXIT_CODE" -eq 42 ]; then
    echo "[Start] Exit 42 - restarting (session refresh)..."
    sleep 2
    continue
  fi

  echo "[Start] Unexpected exit code $EXIT_CODE - restarting in 10s..."
  sleep 10
done
