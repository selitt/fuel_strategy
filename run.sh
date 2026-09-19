#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
PYTHON="${PYTHON:-python3}"
if [[ -x .venv/bin/python ]]; then PYTHON=.venv/bin/python; fi
if [[ "${1:-}" == "dev" ]]; then
  "$PYTHON" -m uvicorn src.app.api.main:app --host 127.0.0.1 --port "${FUEL_API_PORT:-8000}" --reload &
  API_PID=$!
  trap 'kill "$API_PID" 2>/dev/null || true' EXIT INT TERM
  export FUEL_API_PROXY="http://127.0.0.1:${FUEL_API_PORT:-8000}"
  (cd frontend && npm run dev)
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
