#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)
cd "$ROOT_DIR"

usage() {
  cat <<'EOF'
Usage: ./run.sh [command]

Commands:
  start, public  build and start the public Docker service (default)
  status         show Docker service status
  logs           follow the web service logs
  stop           stop the web service without deleting its data
  local          run the production site directly on localhost
  dev            run the API and Vite development servers
  help           show this help
EOF
}

select_python() {
  if [[ -z "${PYTHON:-}" ]]; then
    PYTHON=python3
    if [[ -x .venv/bin/python ]]; then PYTHON=.venv/bin/python; fi
  fi
}

select_compose_env() {
  COMPOSE_FILE="$ROOT_DIR/docker/compose.yaml"
  COMPOSE_ENV="$ROOT_DIR/docker/.env"
  if [[ ! -f "$COMPOSE_ENV" ]]; then
    COMPOSE_ENV="$ROOT_DIR/docker/.env.example"
  fi
  if [[ ! -f "$COMPOSE_FILE" || ! -f "$COMPOSE_ENV" ]]; then
    printf 'ERROR: Docker configuration is incomplete. Expected %s and %s.\n' \
      "$COMPOSE_FILE" "$COMPOSE_ENV" >&2
    exit 2
  fi
}

compose() {
  docker compose --env-file "$COMPOSE_ENV" -f "$COMPOSE_FILE" "$@"
}

run_public() {
  select_compose_env
  export FUEL_BIND_HOST="${FUEL_BIND_HOST:-0.0.0.0}"
  export FUEL_WEB_PORT="${FUEL_WEB_PORT:-8080}"
  if ! compose up --build -d --wait; then
    printf 'ERROR: site did not become ready; recent web logs follow.\n' >&2
    compose logs --tail=100 web >&2 || true
    return 1
  fi
  printf 'Site is ready on port %s.\n' "$FUEL_WEB_PORT"
  printf 'In GigaIDE, make port %s Public and choose Open in new tab.\n' "$FUEL_WEB_PORT"
}

run_local() {
  select_python
  if [[ -z "${FUEL_FRONTEND_DIR:-}" ]]; then
    if [[ -f frontend/dist/index.html ]]; then
      export FUEL_FRONTEND_DIR="$PWD/frontend/dist"
    else
      "$PYTHON" tools/verify_prebuilt.py
      export FUEL_FRONTEND_DIR="$PWD/frontend/prebuilt"
    fi
  fi
  exec "$PYTHON" -m uvicorn src.app.web:create_web_app --factory \
    --host "${FUEL_BIND_HOST:-127.0.0.1}" --port "${FUEL_WEB_PORT:-8080}" --workers 1
}

run_dev() {
  select_python
  # Separate child process groups keep terminal signals from reaching the API
  # twice (directly and through cleanup); waiting below also reaps the children.
  set -m
  "$PYTHON" -m uvicorn src.app.main:app --host 127.0.0.1 \
    --port "${FUEL_API_PORT:-8000}" --reload &
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
}

command_name="${1:-start}"
case "$command_name" in
  start|public)
    run_public
    ;;
  status)
    select_compose_env
    compose ps
    ;;
  logs)
    select_compose_env
    compose logs --tail=100 -f web
    ;;
  stop)
    select_compose_env
    compose stop web
    ;;
  local)
    run_local
    ;;
  dev)
    run_dev
    ;;
  help|--help|-h)
    usage
    ;;
  *)
    printf 'Unknown command: %s\n\n' "$command_name" >&2
    usage >&2
    exit 2
    ;;
esac
