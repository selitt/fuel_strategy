#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if [[ -z "${PYTHON:-}" ]]; then
  PYTHON=python3
  if [[ -x .venv/bin/python ]]; then PYTHON=.venv/bin/python; fi
fi
if [[ "${1:-}" == "dev" ]]; then
  # Separate child process groups keep terminal signals from reaching the API
  # twice (directly and through cleanup); waiting below also reaps the children.
  set -m
  "$PYTHON" -m uvicorn src.app.api.main:app --host 127.0.0.1 --port "${FUEL_API_PORT:-8000}" --reload &
  API_PID=$!
  UI_PID=""
  cleanup() {
    trap - EXIT INT TERM
    kill -TERM -- "-$API_PID" 2>/dev/null || true
    if [[ -n "$UI_PID" ]]; then
      kill -TERM -- "-$UI_PID" 2>/dev/null || true
    fi
    wait "$API_PID" 2>/dev/null || true
    if [[ -n "$UI_PID" ]]; then wait "$UI_PID" 2>/dev/null || true; fi
  }
  trap cleanup EXIT
  trap 'exit 130' INT
  trap 'exit 143' TERM
  export FUEL_API_PROXY="http://127.0.0.1:${FUEL_API_PORT:-8000}"
  (cd frontend && exec npm run dev) &
  UI_PID=$!
  wait "$UI_PID"
else
  if [[ -z "${FUEL_FRONTEND_DIR:-}" ]]; then
    if [[ -f frontend/dist/index.html ]]; then
      export FUEL_FRONTEND_DIR="$PWD/frontend/dist"
    else
      "$PYTHON" tools/verify_prebuilt.py
      export FUEL_FRONTEND_DIR="$PWD/frontend/prebuilt"
    fi
  fi
  exec "$PYTHON" -m uvicorn src.app.web:create_web_app --factory --host "${FUEL_BIND_HOST:-127.0.0.1}" --port "${FUEL_WEB_PORT:-8080}" --workers 1
fi
