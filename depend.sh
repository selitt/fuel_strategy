#!/usr/bin/env bash
set -Eeuo pipefail
IFS=$'\n\t'

ROOT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)
VERSION_FILE="$ROOT_DIR/tools/tool-versions.env"
MODE=install
FULL_CHECK=0
BACKEND_ONLY=0
BACKEND_READY=0
FRONTEND_READY=0
BLOCKED=0
G0_PENDING=0
GROUP_RELOAD_NEEDED=0
DOCKER_READY=0

usage() {
    cat <<'EOF'
Usage: ./depend.sh [options]

Prepare the local development tools for the Kosmo Piter project.

Options:
  --check       inspect only; do not install or change user configuration
  --full-check  run locked dependency checks and the available build checks
  --backend-only  prepare/test Python API without Node or Docker
  --help        show this help

The script never starts application services. Docker Desktop licensing and
administrator prompts remain with the machine owner.
EOF
}

for argument in "$@"; do
    case "$argument" in
        --check)
            MODE=check
            ;;
        --full-check)
            FULL_CHECK=1
            ;;
        --backend-only)
            BACKEND_ONLY=1
            ;;
        --help|-h)
            usage
            exit 0
            ;;
        *)
            printf 'Unknown option: %s\n\n' "$argument" >&2
            usage >&2
            exit 2
            ;;
    esac
done

if [[ "${OSTYPE:-}" == msys* || "${OSTYPE:-}" == cygwin* || "${OSTYPE:-}" == win32* ]]; then
    if command -v powershell.exe >/dev/null 2>&1; then
        exec powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$ROOT_DIR/depend.ps1" "$@"
    fi
    printf 'BLOCKED: native Windows requires PowerShell; powershell.exe was not found.\n' >&2
    exit 2
fi

if [[ ! -f "$ROOT_DIR/START_HERE.md" || ! -d "$ROOT_DIR/tasks" || ! -d "$ROOT_DIR/src" ]]; then
    printf 'BLOCKED: run this script from the command repository root.\n' >&2
    exit 2
fi

if [[ ! -f "$VERSION_FILE" ]]; then
    printf 'BLOCKED: missing shared version file: %s\n' "$VERSION_FILE" >&2
    exit 2
fi

# This file contains data-only KEY=value assignments maintained with the setup.
# shellcheck disable=SC1090
source "$VERSION_FILE"

PYTHON_TARGET="${PYTHON_VERSION:-3.12}"
NODE_TARGET="${NODE_VERSION:-24.21.0}"
UV_TARGET="${UV_VERSION:-0.12.17}"

trim_first_line() {
    tr -d '\r' < "$1" | sed -n '1p' | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//'
}

if [[ -f "$ROOT_DIR/.python-version" ]]; then
    candidate=$(trim_first_line "$ROOT_DIR/.python-version")
    if [[ "$candidate" =~ ^[0-9]+\.[0-9]+(\.[0-9]+)?$ ]]; then
        PYTHON_TARGET="$candidate"
    else
        printf 'WARN: ignoring invalid .python-version value: %s\n' "$candidate"
    fi
fi

if [[ -f "$ROOT_DIR/.node-version" ]]; then
    candidate=$(trim_first_line "$ROOT_DIR/.node-version")
    candidate=${candidate#v}
    if [[ "$candidate" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        NODE_TARGET="$candidate"
    else
        printf 'WARN: ignoring non-exact .node-version value: %s\n' "$candidate"
    fi
fi

export PATH="$HOME/.local/node/bin:$HOME/.local/bin:$PATH"

info() { printf 'INFO: %s\n' "$*"; }
pass() { printf 'PASS: %s\n' "$*"; }
warn() { printf 'WARN: %s\n' "$*"; }
blocked() {
    printf 'BLOCKED: %s\n' "$*" >&2
    BLOCKED=$((BLOCKED + 1))
}

command_exists() { command -v "$1" >/dev/null 2>&1; }

version_matches() {
    local actual="$1"
    local target="$2"
    if [[ "$target" =~ ^[0-9]+\.[0-9]+$ ]]; then
        [[ "$actual" == "$target".* || "$actual" == "$target" ]]
    else
        [[ "$actual" == "$target" ]]
    fi
}

sudo_run() {
    if ! sudo -v; then
        blocked "sudo authentication failed or is unavailable"
        return 1
    fi
    sudo "$@"
}

persist_path() {
    local line='export PATH="$HOME/.local/node/bin:$HOME/.local/bin:$PATH"'
    local profile
    if [[ "$(uname -s)" == Darwin ]]; then
        profile="$HOME/.zprofile"
    else
        profile="$HOME/.profile"
    fi
    if ! grep -Fqx "$line" "$profile" 2>/dev/null; then
        printf '\n%s\n' "$line" >> "$profile"
        info "added user-local Node/uv PATH to $profile"
    fi
}

linux_family() {
    local distro_id=""
    if [[ -r /etc/os-release ]]; then
        distro_id=$(awk -F= '/^ID=/{gsub(/"/, "", $2); print tolower($2); exit}' /etc/os-release)
    fi
    case "$distro_id" in
        ubuntu|debian) printf 'debian\n' ;;
        fedora) printf 'fedora\n' ;;
        *) printf 'unsupported\n' ;;
    esac
}

install_base_packages() {
    local os family
    os=$(uname -s)
    if [[ "$os" == Linux ]]; then
        family=$(linux_family)
        case "$family" in
            debian)
                if ! command_exists apt-get; then
                    blocked "apt-get is missing on this Debian-family system"
                    return 1
                fi
                sudo_run apt-get update && sudo_run apt-get install -y ca-certificates curl git || return 1
                ;;
            fedora)
                if ! command_exists dnf; then
                    blocked "dnf is missing on this Fedora system"
                    return 1
                fi
                sudo_run dnf install -y ca-certificates curl git || return 1
                ;;
            *)
                blocked "unsupported Linux distribution; supported: Ubuntu, Debian, Fedora"
                return 1
                ;;
        esac
    elif [[ "$os" == Darwin ]]; then
        if ! command_exists brew; then
            blocked "Homebrew is absent; install Git/curl from the official macOS tools first"
            return 1
        fi
        brew install git curl
    else
        blocked "unsupported POSIX operating system: $os"
        return 1
    fi
}

ensure_git() {
    if command_exists git; then
        pass "git $(git --version | awk '{print $3}')"
        return 0
    fi
    if [[ "$MODE" == check ]]; then
        blocked "git is missing"
        return 1
    fi
    install_base_packages || return 1
    if command_exists git; then
        pass "git $(git --version | awk '{print $3}')"
    else
        blocked "git installation did not provide git"
        return 1
    fi
}

ensure_uv() {
    local actual=""
    if command_exists uv; then
        actual=$(uv --version 2>/dev/null | awk '{print $2}' || true)
    fi
    if [[ -n "$actual" ]] && version_matches "$actual" "$UV_TARGET"; then
        pass "uv $actual"
        return 0
    fi
    if [[ "$MODE" == check ]]; then
        if [[ -n "$actual" ]]; then
            blocked "uv $actual found; expected $UV_TARGET"
        else
            blocked "uv is missing"
        fi
        return 1
    fi
    if ! command_exists curl; then
        install_base_packages || return 1
    fi
    local installer
    installer=$(mktemp)
    if ! curl -fsSL "https://astral.sh/uv/${UV_TARGET}/install.sh" -o "$installer"; then
        rm -f "$installer"
        blocked "could not download the official uv installer"
        return 1
    fi
    if ! sh "$installer"; then
        rm -f "$installer"
        blocked "the official uv installer failed"
        return 1
    fi
    rm -f "$installer"
    export PATH="$HOME/.local/node/bin:$HOME/.local/bin:$PATH"
    actual=$(uv --version 2>/dev/null | awk '{print $2}' || true)
    if [[ -n "$actual" ]] && version_matches "$actual" "$UV_TARGET"; then
        pass "uv $actual"
    else
        blocked "uv was installed but the expected version was not found"
        return 1
    fi
}

ensure_python() {
    local actual=""
    if command_exists python3; then
        actual=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:3])))' 2>/dev/null || true)
    fi
    if [[ -n "$actual" ]] && version_matches "$actual" "$PYTHON_TARGET"; then
        pass "Python $actual"
        return 0
    fi
    if [[ "$MODE" == check ]]; then
        if [[ -n "$actual" ]]; then
            blocked "Python $actual found; expected $PYTHON_TARGET"
        else
            blocked "python3 is missing"
        fi
        return 1
    fi
    if ! command_exists uv; then
        blocked "cannot install managed Python before uv is available"
        return 1
    fi
    if ! uv python install "$PYTHON_TARGET"; then
        blocked "uv could not install Python $PYTHON_TARGET"
        return 1
    fi
    if uv python find "$PYTHON_TARGET" >/dev/null 2>&1; then
        pass "uv-managed Python $PYTHON_TARGET"
    else
        blocked "uv Python installation completed without a discoverable interpreter"
        return 1
    fi
}

ensure_node() {
    local actual=""
    if command_exists node; then
        actual=$(node --version 2>/dev/null | sed 's/^v//' || true)
    fi
    if [[ -n "$actual" ]] && version_matches "$actual" "$NODE_TARGET"; then
        if command_exists npm; then
            pass "Node $actual / npm $(npm --version)"
        else
            blocked "Node $actual is present but npm is missing"
            return 1
        fi
        return 0
    fi
    if [[ "$MODE" == check ]]; then
        if [[ -n "$actual" ]]; then
            blocked "Node $actual found; expected $NODE_TARGET"
        else
            blocked "Node.js is missing"
        fi
        return 1
    fi
    if ! [[ "$NODE_TARGET" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        blocked "Node target must be an exact release for automatic archive installation: $NODE_TARGET"
        return 1
    fi
    if ! command_exists curl; then
        install_base_packages || return 1
    fi
    local os arch node_os node_arch archive node_root node_dir tmp
    os=$(uname -s)
    arch=$(uname -m)
    case "$os" in
        Linux) node_os=linux ;;
        Darwin) node_os=darwin ;;
        *) blocked "unsupported POSIX platform for official Node archive: $os"; return 1 ;;
    esac
    case "$arch" in
        x86_64|amd64) node_arch=x64 ;;
        aarch64|arm64) node_arch=arm64 ;;
        *) blocked "unsupported CPU architecture for official Node archive: $arch"; return 1 ;;
    esac
    archive="node-v${NODE_TARGET}-${node_os}-${node_arch}.tar.xz"
    node_root="$HOME/.local/lib/nodejs"
    node_dir="$node_root/node-v${NODE_TARGET}-${node_os}-${node_arch}"
    tmp=$(mktemp)
    info "downloading official Node.js archive $NODE_TARGET for $node_os/$node_arch"
    if ! curl -fL "https://nodejs.org/dist/v${NODE_TARGET}/${archive}" -o "$tmp"; then
        rm -f "$tmp"
        blocked "could not download $archive from nodejs.org"
        return 1
    fi
    mkdir -p "$node_root"
    if ! tar -xJf "$tmp" -C "$node_root"; then
        rm -f "$tmp"
        blocked "could not unpack $archive"
        return 1
    fi
    rm -f "$tmp"
    ln -sfn "$node_dir" "$HOME/.local/node"
    export PATH="$HOME/.local/node/bin:$HOME/.local/bin:$PATH"
    persist_path
    actual=$(node --version 2>/dev/null | sed 's/^v//' || true)
    if [[ "$actual" == "$NODE_TARGET" ]] && command_exists npm; then
        pass "Node $actual / npm $(npm --version)"
    else
        blocked "Node archive installed but the expected executable is not active"
        return 1
    fi
}

install_fedora_docker_repo() {
    if [[ -f /etc/yum.repos.d/docker-ce.repo ]]; then
        return 0
    fi
    sudo_run dnf install -y dnf-plugins-core || return 1
    sudo_run dnf config-manager addrepo --from-repofile https://download.docker.com/linux/fedora/docker-ce.repo
}

install_linux_compose() {
    case "$(linux_family)" in
    debian)
        sudo_run apt-get update || return 1
        if apt-cache show docker-compose-plugin >/dev/null 2>&1; then
            sudo_run apt-get install -y docker-compose-plugin
        else
            sudo_run apt-get install -y docker-compose-v2
        fi
        ;;
    fedora)
        install_fedora_docker_repo || return 1
        sudo_run dnf install -y docker-compose-plugin
        ;;
    *)
        return 1
        ;;
    esac
}

install_linux_docker() {
    case "$(linux_family)" in
    debian)
        sudo_run apt-get update || return 1
        sudo_run apt-get install -y docker.io || return 1
        install_linux_compose
        ;;
    fedora)
        install_fedora_docker_repo || return 1
        sudo_run dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
        ;;
    *)
        return 1
        ;;
    esac
}

ensure_docker() {
    local os family=""
    os=$(uname -s)
    if [[ "$os" == Linux ]]; then
        family=$(linux_family)
        if [[ "$family" == unsupported ]]; then
            blocked "unsupported Linux distribution; supported: Ubuntu, Debian, Fedora"
            return 1
        fi
    fi
    if ! command_exists docker; then
        if [[ "$MODE" == check ]]; then
            blocked "Docker CLI is missing"
            return 1
        fi
        if [[ "$os" == Linux ]]; then
            if ! install_linux_docker; then
                blocked "Docker installation failed; use the official distro instructions"
                return 1
            fi
        elif [[ "$os" == Darwin ]]; then
            blocked "install and accept Docker Desktop for macOS, then rerun this script"
            return 1
        else
            blocked "install Docker Desktop for this platform, then rerun this script"
            return 1
        fi
    fi
    if ! command_exists docker; then
        blocked "Docker CLI is still missing after installation"
        return 1
    fi
    if docker info >/dev/null 2>&1; then
        DOCKER_READY=1
    else
        local docker_error
        docker_error=$(docker info 2>&1 || true)
        if [[ "$os" == Linux && "$docker_error" == *permission\ denied* && -S /var/run/docker.sock ]]; then
            if [[ "$MODE" == check ]]; then
                blocked "Docker daemon is running but this shell cannot access the Docker socket"
                return 1
            fi
            if getent group docker >/dev/null 2>&1 && ! id -nG | tr ' ' '\n' | grep -qx docker; then
                if sudo_run usermod -aG docker "$USER"; then
                    GROUP_RELOAD_NEEDED=1
                    warn "added $USER to docker group; open a new shell before running Compose"
                fi
            fi
            if command_exists sg && sg docker -c 'docker info >/dev/null 2>&1'; then
                DOCKER_READY=1
            else
                blocked "Docker socket access needs a new login shell"
                return 1
            fi
        elif [[ "$os" == Linux ]]; then
            if [[ "$MODE" == check ]]; then
                blocked "Docker daemon is unavailable"
                return 1
            fi
            if command_exists systemctl && sudo_run systemctl enable --now docker; then
                DOCKER_READY=1
            elif command_exists service && sudo_run service docker start; then
                DOCKER_READY=1
            else
                blocked "Docker daemon is unavailable; start Docker and rerun this script"
                return 1
            fi
        else
            blocked "Docker CLI exists but Docker Desktop is not running"
            return 1
        fi
    fi
    if [[ "$DOCKER_READY" != 1 ]]; then
        return 1
    fi
    pass "Docker $(docker --version | sed 's/^Docker version //; s/,.*//')"
    if docker compose version >/dev/null 2>&1; then
        pass "$(docker compose version)"
    elif [[ "$MODE" == check ]]; then
        blocked "Docker Compose v2 is missing"
        return 1
    elif [[ "$os" == Linux ]]; then
        if ! install_linux_compose || ! docker compose version >/dev/null 2>&1; then
            blocked "Docker Compose v2 installation failed"
            return 1
        fi
        pass "$(docker compose version)"
    else
        blocked "Docker Desktop must provide docker compose on this platform"
        return 1
    fi
}

run_workspace_check() {
    if [[ -x "$(command -v python3 2>/dev/null || true)" ]]; then
        if python3 "$ROOT_DIR/tools/workspace.py" check; then
            pass "workspace check"
        else
            blocked "workspace check failed"
        fi
    else
        blocked "python3 is required for workspace check"
    fi
}

sync_project_if_ready() {
    # Backend is independently usable while the frontend is not published yet.
    if [[ ! -f "$ROOT_DIR/pyproject.toml" ]]; then
        blocked "pyproject.toml is missing"
        return 0
    fi
    if [[ "$MODE" == check ]]; then
        if [[ -f "$ROOT_DIR/uv.lock" || -f "$ROOT_DIR/requirements-dev.txt" ]]; then
            BACKEND_READY=1
            pass "backend manifests present (dependencies not installed in check mode)"
        else
            blocked "backend requires uv.lock or requirements-dev.txt"
        fi
    elif ! command_exists uv; then
        blocked "uv is unavailable; backend dependencies were not installed"
    elif [[ -f "$ROOT_DIR/uv.lock" ]]; then
        if (cd "$ROOT_DIR" && uv sync --locked); then
            BACKEND_READY=1
            pass "Python dependencies synced from uv.lock"
        else
            blocked "uv sync --locked failed"
        fi
    elif [[ -f "$ROOT_DIR/requirements-dev.txt" ]]; then
        # Until a network-resolved uv.lock is published, use the existing exact
        # requirements pins in a project-local venv, never global site-packages.
        if [[ ! -d "$ROOT_DIR/.venv" ]] && ! uv venv --python "$PYTHON_TARGET" "$ROOT_DIR/.venv"; then
            blocked "could not create the project-local Python environment"
        elif (cd "$ROOT_DIR" && uv pip sync --python "$ROOT_DIR/.venv/bin/python" requirements-dev.txt); then
            BACKEND_READY=1
            pass "Python dependencies synced from requirements-dev.txt"
        else
            blocked "could not sync the project-local Python environment"
        fi
    else
        blocked "backend requires uv.lock or requirements-dev.txt"
    fi

    if [[ "$BACKEND_ONLY" == 1 ]]; then
        return 0
    fi
    if [[ ! -f "$ROOT_DIR/frontend/package.json" || ! -f "$ROOT_DIR/frontend/package-lock.json" ]]; then
        G0_PENDING=1
        warn "G0_PENDING: frontend manifests not published; backend checks remain available"
    elif [[ "$MODE" == check ]]; then
        pass "frontend manifests present (dependencies not installed in check mode)"
    elif npm --prefix "$ROOT_DIR/frontend" ci; then
        FRONTEND_READY=1
        pass "frontend dependencies synced from package-lock.json"
    else
        blocked "npm ci failed"
    fi
    local compose_file=""
    if [[ -f "$ROOT_DIR/compose.yaml" ]]; then
        compose_file="$ROOT_DIR/compose.yaml"
    elif [[ -f "$ROOT_DIR/docker-compose.yml" ]]; then
        compose_file="$ROOT_DIR/docker-compose.yml"
    fi
    if [[ -n "$compose_file" ]]; then
        if [[ "$DOCKER_READY" == 1 ]] && docker compose -f "$compose_file" config --quiet 2>/dev/null; then
            pass "Docker Compose configuration"
        elif [[ "$DOCKER_READY" == 1 ]]; then
            blocked "Docker Compose configuration is invalid"
        fi
    else
        G0_PENDING=1
        warn "G0_PENDING: compose.yaml is not published yet"
    fi
}

run_full_checks() {
    if [[ "$MODE" == check ]]; then
        warn "full checks require install mode so project-local dependencies can be used"
        return 0
    fi
    if [[ "$BACKEND_READY" == 1 ]]; then
        if ! (cd "$ROOT_DIR" && "$ROOT_DIR/.venv/bin/python" -m pytest -q); then
            blocked "backend and workspace tests failed"
        fi
        if ! (cd "$ROOT_DIR" && "$ROOT_DIR/.venv/bin/python" tools/export_openapi.py --check); then
            blocked "published OpenAPI is out of date"
        fi
    else
        blocked "backend tests cannot run without its dependencies"
    fi
    if [[ "$FRONTEND_READY" == 1 ]]; then
        if grep -q '"typecheck"' "$ROOT_DIR/frontend/package.json" && ! npm --prefix "$ROOT_DIR/frontend" run typecheck; then
            blocked "frontend typecheck failed"
        fi
        if grep -q '"build"' "$ROOT_DIR/frontend/package.json" && ! npm --prefix "$ROOT_DIR/frontend" run build; then
            blocked "frontend build failed"
        fi
    fi
}

printf 'Kosmo Piter dependency bootstrap\n'
printf 'root=%s\n' "$ROOT_DIR"
printf 'os=%s arch=%s shell=%s mode=%s\n' "$(uname -s)" "$(uname -m)" "${SHELL:-unknown}" "$MODE"
printf 'targets: python=%s node=%s uv=%s\n' "$PYTHON_TARGET" "$NODE_TARGET" "$UV_TARGET"

ensure_git || true
ensure_uv || true
ensure_python || true
if [[ "$BACKEND_ONLY" == 0 ]]; then
    ensure_node || true
    ensure_docker || true
fi
run_workspace_check
sync_project_if_ready
if [[ "$FULL_CHECK" == 1 ]]; then
    run_full_checks
fi

if [[ "$BLOCKED" != 0 ]]; then
    printf 'RESULT: BLOCKED (%s issue(s))\n' "$BLOCKED" >&2
    exit 2
fi
if [[ "$BACKEND_ONLY" == 1 ]]; then
    printf 'RESULT: READY (backend tools/manifests; frontend and Docker not requested)\n'
elif [[ "$G0_PENDING" == 1 ]]; then
    printf 'RESULT: PROVISIONAL (host tools ready; waiting for W3 G0 manifests)\n'
else
    printf 'RESULT: READY\n'
fi
if [[ "$GROUP_RELOAD_NEEDED" == 1 ]]; then
    printf 'ACTION: open a new shell before using Docker from this shell\n'
fi
