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

PUBLIC_BUILD_DIR=""
PUBLIC_BUILD_CONTAINER=""
CLOUDPUB_CONTAINER="fuel-contour-cloudpub"

cleanup_public_build() {
  local exit_status=$?
  if [[ -n "$PUBLIC_BUILD_CONTAINER" ]]; then
    docker rm -f "$PUBLIC_BUILD_CONTAINER" >/dev/null 2>&1 || true
    PUBLIC_BUILD_CONTAINER=""
  fi
  if [[ -n "$PUBLIC_BUILD_DIR" && -d "$PUBLIC_BUILD_DIR" ]]; then
    rm -rf -- "$PUBLIC_BUILD_DIR"
    PUBLIC_BUILD_DIR=""
  fi
  return "$exit_status"
}

build_public_image() {
  local frontend_image="fuel-contour-frontend-build:local"
  local runtime_image="fuel-contour-web:latest"
  local relative_frontend_dir

  PUBLIC_BUILD_DIR=$(mktemp -d "$ROOT_DIR/.docker-frontend.XXXXXX")
  trap cleanup_public_build EXIT

  docker build \
    --file "$ROOT_DIR/docker/Dockerfile.frontend" \
    --tag "$frontend_image" \
    "$ROOT_DIR"
  PUBLIC_BUILD_CONTAINER=$(docker create "$frontend_image")
  docker cp "$PUBLIC_BUILD_CONTAINER:/build/dist/." "$PUBLIC_BUILD_DIR"
  docker rm -f "$PUBLIC_BUILD_CONTAINER" >/dev/null
  PUBLIC_BUILD_CONTAINER=""

  if [[ ! -f "$PUBLIC_BUILD_DIR/index.html" ]]; then
    printf 'ERROR: frontend build did not produce index.html.\n' >&2
    return 1
  fi

  relative_frontend_dir=${PUBLIC_BUILD_DIR#"$ROOT_DIR"/}
  docker build \
    --build-arg "FUEL_FRONTEND_BUILD_DIR=$relative_frontend_dir" \
    --file "$ROOT_DIR/docker/Dockerfile" \
    --tag "$runtime_image" \
    "$ROOT_DIR"
}

read_cloudpub_token() {
  if [[ -n "${CLOUDPUB_TOKEN:-}" ]]; then
    return 0
  fi
  if [[ ! -r /dev/tty || ! -w /dev/tty ]]; then
    return 1
  fi
  printf 'CloudPub token (leave empty to run without a public link): ' >/dev/tty
  if ! IFS= read -r -s CLOUDPUB_TOKEN </dev/tty; then
    printf '\n' >/dev/tty
    return 1
  fi
  printf '\n' >/dev/tty
  [[ -n "$CLOUDPUB_TOKEN" ]]
}

start_cloudpub() {
  local attempt logs public_url

  if ! read_cloudpub_token; then
    printf 'CloudPub was not started: no token was provided.\n'
    return 0
  fi

  docker rm -f "$CLOUDPUB_CONTAINER" >/dev/null 2>&1 || true
  if ! TOKEN="$CLOUDPUB_TOKEN" docker run --detach \
      --name "$CLOUDPUB_CONTAINER" \
      --network host \
      --restart unless-stopped \
      --env TOKEN \
      cloudpub/cloudpub:latest publish http "$FUEL_WEB_PORT" >/dev/null; then
    unset CLOUDPUB_TOKEN
    printf 'ERROR: CloudPub tunnel could not be started.\n' >&2
    return 1
  fi
  unset CLOUDPUB_TOKEN

  for attempt in $(seq 1 30); do
    logs=$(docker logs "$CLOUDPUB_CONTAINER" 2>&1 || true)
    public_url=$(printf '%s\n' "$logs" \
      | grep -Eo 'https://[A-Za-z0-9.-]+\.cloudpub\.ru[^[:space:]]*' \
      | head -n 1 || true)
    if [[ -n "$public_url" ]]; then
      printf '\nPublic site: %s\n' "$public_url"
      printf 'Share this URL together with the site login and password.\n'
      return 0
    fi
    sleep 1
  done

  printf 'ERROR: CloudPub did not provide a public URL; recent logs follow.\n' >&2
  docker logs --tail=100 "$CLOUDPUB_CONTAINER" >&2 || true
  return 1
}

stop_cloudpub() {
  docker rm -f "$CLOUDPUB_CONTAINER" >/dev/null 2>&1 || true
}

run_public() {
  select_compose_env
  select_python
  if ! "$PYTHON" "$ROOT_DIR/tools/configure_access.py" \
      --compose-file "$COMPOSE_FILE" --source-env "$COMPOSE_ENV" \
      --target-env "$ROOT_DIR/docker/.env"; then
    printf 'ERROR: public access is not configured; Docker was not started.\n' >&2
    return 2
  fi
  if [[ -f "$ROOT_DIR/docker/.env" ]]; then
    COMPOSE_ENV="$ROOT_DIR/docker/.env"
  fi
  export FUEL_BIND_HOST="${FUEL_BIND_HOST:-0.0.0.0}"
  export FUEL_WEB_PORT="${FUEL_WEB_PORT:-8080}"
  if ! build_public_image || ! compose up --no-build -d --wait; then
    printf 'ERROR: site did not become ready; recent web logs follow.\n' >&2
    compose logs --tail=100 web >&2 || true
    return 1
  fi
  printf 'Site is ready on port %s.\n' "$FUEL_WEB_PORT"
  start_cloudpub
}

run_local() {
  select_python
  export FUEL_PUBLIC_MODE=0
  export FUEL_ALLOW_UNAUTHENTICATED_LOCAL="${FUEL_ALLOW_UNAUTHENTICATED_LOCAL:-1}"
  export FUEL_BIND_HOST="${FUEL_BIND_HOST:-127.0.0.1}"
  if [[ -z "${FUEL_FRONTEND_DIR:-}" ]]; then
    if [[ ! -f frontend/dist/index.html ]]; then
      printf 'ERROR: frontend/dist is missing. Run npm --prefix frontend run build.\n' >&2
      exit 2
    fi
    export FUEL_FRONTEND_DIR="$PWD/frontend/dist"
  fi
  exec "$PYTHON" -m uvicorn src.app.web:create_web_app --factory \
    --host "$FUEL_BIND_HOST" --port "${FUEL_WEB_PORT:-8080}" --workers 1 \
    --no-proxy-headers
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
    docker ps --filter "name=^/${CLOUDPUB_CONTAINER}$" \
      --format 'CloudPub tunnel: {{.Status}}'
    ;;
  logs)
    select_compose_env
    compose logs --tail=100 -f web
    ;;
  stop)
    select_compose_env
    stop_cloudpub
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
