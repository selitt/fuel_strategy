# POSIX-style --flags are parsed from $args; keep this a non-advanced script.
param()

$ErrorActionPreference = "Continue"
$Root = (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Mode = "install"
$FullCheck = $false
$BackendOnly = $false
$BackendReady = $false
$FrontendReady = $false
$Blocked = 0
$G0Pending = $false

function Show-Usage {
    @"
Usage: .\depend.ps1 [--check] [--full-check]

Prepare the local development tools for the Kosmo Piter project.

  --check       inspect only; do not install or change user configuration
  --full-check  run locked dependency checks and available build checks
  --backend-only  prepare/test Python API without Node or Docker
  --help        show this help

The script never starts application services. Docker Desktop licensing and
administrator prompts remain with the machine owner.
"@
}

foreach ($Argument in $args) {
    switch ($Argument) {
        "--backend-only" { $BackendOnly = $true; continue }
        "--check" { $Mode = "check"; continue }
        "-Check" { $Mode = "check"; continue }
        "--full-check" { $FullCheck = $true; continue }
        "-FullCheck" { $FullCheck = $true; continue }
        "--help" { Show-Usage; exit 0 }
        "-Help" { Show-Usage; exit 0 }
        default {
            Write-Error "Unknown option: $Argument"
            Show-Usage
            exit 2
        }
    }
}

function Write-Info([string]$Message) { Write-Host "INFO: $Message" }
function Write-Pass([string]$Message) { Write-Host "PASS: $Message" }
function Write-Warn([string]$Message) { Write-Host "WARN: $Message" }
function Write-Blocked([string]$Message) {
    Write-Error "BLOCKED: $Message"
    $script:Blocked++
}
function Test-Command([string]$Name) { return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue) }

function Refresh-SessionPath {
    $MachinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
    $UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
    $env:Path = "$MachinePath;$UserPath"
}

if (-not (Test-Path (Join-Path $Root "START_HERE.md")) -or
    -not (Test-Path (Join-Path $Root "tasks")) -or
    -not (Test-Path (Join-Path $Root "src"))) {
    Write-Blocked "run this script from the command repository root"
    exit 2
}

$VersionFile = Join-Path $Root "tools\tool-versions.env"
if (-not (Test-Path $VersionFile)) {
    Write-Blocked "missing shared version file: $VersionFile"
    exit 2
}

$Versions = @{}
foreach ($Line in Get-Content -LiteralPath $VersionFile) {
    if ($Line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*([^#\s]+)') {
        $Versions[$Matches[1]] = $Matches[2]
    }
}

$PythonTarget = if ($Versions.ContainsKey("PYTHON_VERSION")) { $Versions["PYTHON_VERSION"] } else { "3.12" }
$NodeTarget = if ($Versions.ContainsKey("NODE_VERSION")) { $Versions["NODE_VERSION"] } else { "24.21.0" }
$UvTarget = if ($Versions.ContainsKey("UV_VERSION")) { $Versions["UV_VERSION"] } else { "0.12.17" }

$PythonVersionFile = Join-Path $Root ".python-version"
if (Test-Path $PythonVersionFile) {
    $Candidate = (Get-Content -LiteralPath $PythonVersionFile | Select-Object -First 1).Trim()
    if ($Candidate -match '^[0-9]+\.[0-9]+(\.[0-9]+)?$') { $PythonTarget = $Candidate }
    else { Write-Warn "ignoring invalid .python-version value: $Candidate" }
}

$NodeVersionFile = Join-Path $Root ".node-version"
if (Test-Path $NodeVersionFile) {
    $Candidate = ((Get-Content -LiteralPath $NodeVersionFile | Select-Object -First 1).Trim()).TrimStart("v")
    if ($Candidate -match '^[0-9]+\.[0-9]+\.[0-9]+$') { $NodeTarget = $Candidate }
    else { Write-Warn "ignoring non-exact .node-version value: $Candidate" }
}

function Test-VersionMatch([string]$Actual, [string]$Target) {
    if ($Target -match '^[0-9]+\.[0-9]+$') {
        return $Actual -eq $Target -or $Actual.StartsWith("$Target.")
    }
    return $Actual -eq $Target
}

function Invoke-Winget([string]$PackageId) {
    if (-not (Test-Command "winget")) {
        Write-Blocked "winget is unavailable; install $PackageId from the official installer"
        return $false
    }
    & winget install --id $PackageId -e --accept-source-agreements --accept-package-agreements
    if ($LASTEXITCODE -ne 0) {
        Write-Blocked "winget could not install $PackageId"
        return $false
    }
    Refresh-SessionPath
    return $true
}

function Ensure-Git {
    if (Test-Command "git") {
        $Version = (& git --version) -replace '^git version\s+', ''
        Write-Pass "git $Version"
        return
    }
    if ($Mode -eq "check") { Write-Blocked "git is missing"; return }
    [void](Invoke-Winget "Git.Git")
    if (Test-Command "git") { Write-Pass "git installed" }
    else { Write-Blocked "Git is still missing after installation" }
}

function Ensure-Uv {
    $Actual = ""
    if (Test-Command "uv") { $Actual = ((& uv --version) -replace '^uv\s+', '').Trim() }
    if ($Actual -and (Test-VersionMatch $Actual $UvTarget)) {
        Write-Pass "uv $Actual"
        return
    }
    if ($Mode -eq "check") {
        if ($Actual) { Write-Blocked "uv $Actual found; expected $UvTarget" }
        else { Write-Blocked "uv is missing" }
        return
    }
    if (-not (Invoke-Winget "astral-sh.uv")) { return }
    if (Test-Command "uv") {
        $Actual = ((& uv --version) -replace '^uv\s+', '').Trim()
        if (Test-VersionMatch $Actual $UvTarget) { Write-Pass "uv $Actual" }
        else { Write-Warn "uv $Actual installed; expected provisional target $UvTarget" }
    }
    else { Write-Blocked "uv is still missing after installation" }
}

function Ensure-Python {
    $PythonCommand = $null
    if (Test-Command "py") { $PythonCommand = "py" }
    elseif (Test-Command "python") { $PythonCommand = "python" }
    $Actual = ""
    if ($null -ne $PythonCommand) {
        $Actual = ((& $PythonCommand --version) -replace '^Python\s+', '').Trim()
    }
    if ($Actual -and (Test-VersionMatch $Actual $PythonTarget)) {
        Write-Pass "Python $Actual"
        return
    }
    if ($Mode -eq "check") {
        if ($Actual) { Write-Blocked "Python $Actual found; expected $PythonTarget" }
        else { Write-Blocked "Python is missing" }
        return
    }
    if (-not (Test-Command "uv")) {
        Write-Blocked "cannot install managed Python before uv is available"
        return
    }
    & uv python install $PythonTarget
    if ($LASTEXITCODE -eq 0) { Write-Pass "uv-managed Python $PythonTarget" }
    else { Write-Blocked "uv could not install Python $PythonTarget" }
}

function Ensure-Node {
    $Actual = ""
    if (Test-Command "node") { $Actual = ((& node --version) -replace '^v', '').Trim() }
    if ($Actual -and (Test-VersionMatch $Actual $NodeTarget) -and (Test-Command "npm")) {
        $NpmVersion = (& npm --version).Trim()
        Write-Pass "Node $Actual / npm $NpmVersion"
        return
    }
    if ($Mode -eq "check") {
        if ($Actual) { Write-Blocked "Node $Actual found; expected $NodeTarget" }
        else { Write-Blocked "Node.js is missing" }
        return
    }
    if (-not (Invoke-Winget "OpenJS.NodeJS.LTS")) { return }
    if (Test-Command "node") {
        $Actual = ((& node --version) -replace '^v', '').Trim()
        if (-not (Test-Command "npm")) { Write-Blocked "npm is still missing after Node.js installation" }
        elseif (Test-VersionMatch $Actual $NodeTarget) { Write-Pass "Node $Actual / npm $((& npm --version).Trim())" }
        else { Write-Blocked "Node $Actual installed but expected $NodeTarget" }
    }
    else {
        Write-Blocked "Node.js is still missing after installation"
    }
}

function Ensure-Docker {
    if (-not (Test-Command "docker")) {
        Write-Blocked "Docker CLI is missing; install Docker Desktop and rerun this script"
        return
    }
    $null = & docker info 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Blocked "Docker Desktop is installed but its daemon is not running"
        return
    }
    Write-Pass ((& docker --version) -replace '^Docker version\s+', 'Docker ')
    $null = & docker compose version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Pass ((& docker compose version).Trim())
    }
    else {
        Write-Blocked "Docker Compose v2 is unavailable; update or repair Docker Desktop"
    }
}

function Invoke-WorkspaceCheck {
    if (Test-Command "py") { & py -3 (Join-Path $Root "tools\workspace.py") check }
    elseif (Test-Command "python") { & python (Join-Path $Root "tools\workspace.py") check }
    else { Write-Blocked "Python is required for workspace check"; return }
    if ($LASTEXITCODE -eq 0) { Write-Pass "workspace check" }
    else { Write-Blocked "workspace check failed" }
}

function Sync-ProjectIfReady {
    if (-not (Test-Path (Join-Path $Root "pyproject.toml"))) {
        Write-Blocked "pyproject.toml is missing"
        return
    }
    $Lock = Join-Path $Root "uv.lock"
    $Requirements = Join-Path $Root "requirements-dev.txt"
    $VenvPython = Join-Path $Root ".venv\Scripts\python.exe"
    if ($Mode -eq "check") {
        if ((Test-Path $Lock) -or (Test-Path $Requirements)) {
            $script:BackendReady = $true
            Write-Pass "backend manifests present (dependencies not installed in check mode)"
        }
        else { Write-Blocked "backend requires uv.lock or requirements-dev.txt" }
    }
    elseif (-not (Test-Command "uv")) { Write-Blocked "uv is unavailable" }
    else {
        Push-Location $Root
        try {
            if (Test-Path $Lock) {
                & uv sync --locked
                if ($LASTEXITCODE -eq 0) {
                    $script:BackendReady = $true
                    Write-Pass "Python dependencies synced from uv.lock"
                }
                else { Write-Blocked "uv sync --locked failed" }
            }
            elseif (Test-Path $Requirements) {
                if (-not (Test-Path (Join-Path $Root ".venv"))) {
                    & uv venv --python $PythonTarget (Join-Path $Root ".venv")
                    if ($LASTEXITCODE -ne 0) { Write-Blocked "could not create the project-local Python environment" }
                }
                if (Test-Path $VenvPython) {
                    & uv pip sync --python $VenvPython $Requirements
                    if ($LASTEXITCODE -eq 0) {
                        $script:BackendReady = $true
                        Write-Pass "Python dependencies synced from requirements-dev.txt"
                    }
                    else { Write-Blocked "could not sync the project-local Python environment" }
                }
                else { Write-Blocked "project-local Python environment is unavailable" }
            }
            else { Write-Blocked "backend requires uv.lock or requirements-dev.txt" }
        }
        finally { Pop-Location }
    }
    if ($BackendOnly) { return }
    $Package = Join-Path $Root "frontend\package.json"
    $PackageLock = Join-Path $Root "frontend\package-lock.json"
    if (-not ((Test-Path $Package) -and (Test-Path $PackageLock))) {
        $script:G0Pending = $true
        Write-Warn "G0_PENDING: frontend manifests not published; backend checks remain available"
    }
    elseif ($Mode -eq "check") { Write-Pass "frontend manifests present (dependencies not installed in check mode)" }
    else {
        & npm --prefix (Join-Path $Root "frontend") ci
        if ($LASTEXITCODE -eq 0) {
            $script:FrontendReady = $true
            Write-Pass "frontend dependencies synced from package-lock.json"
        }
        else { Write-Blocked "npm ci failed" }
    }
    $Compose = Join-Path $Root "compose.yaml"
    if (-not (Test-Path $Compose)) { $Compose = Join-Path $Root "docker-compose.yml" }
    if (Test-Path $Compose) {
        if (Test-Command "docker") {
            $null = & docker compose -f $Compose config --quiet
            if ($LASTEXITCODE -eq 0) { Write-Pass "Docker Compose configuration" }
            else { Write-Blocked "Docker Compose configuration is invalid" }
        }
    }
    else {
        $script:G0Pending = $true
        Write-Warn "G0_PENDING: compose.yaml is not published yet"
    }
}

function Invoke-FullChecks {
    if ($Mode -eq "check") { Write-Warn "full checks require install mode"; return }
    if ($BackendReady) {
        Push-Location $Root
        try {
            $VenvPython = Join-Path $Root ".venv\Scripts\python.exe"
            & $VenvPython -m pytest -q
            if ($LASTEXITCODE -ne 0) { Write-Blocked "backend and workspace tests failed" }
            & $VenvPython tools/export_openapi.py --check
            if ($LASTEXITCODE -ne 0) { Write-Blocked "published OpenAPI is out of date" }
        }
        finally { Pop-Location }
    }
    else { Write-Blocked "backend tests cannot run without its dependencies" }
    if ($FrontendReady) {
        $PackageText = Get-Content -Raw -LiteralPath (Join-Path $Root "frontend\package.json")
        if ($PackageText -match '"typecheck"') {
            & npm --prefix (Join-Path $Root "frontend") run typecheck
            if ($LASTEXITCODE -ne 0) { Write-Blocked "frontend typecheck failed" }
        }
        if ($PackageText -match '"build"') {
            & npm --prefix (Join-Path $Root "frontend") run build
            if ($LASTEXITCODE -ne 0) { Write-Blocked "frontend build failed" }
        }
    }
}

Write-Host "Kosmo Piter dependency bootstrap"
Write-Host "root=$Root"
Write-Host "os=Windows arch=$env:PROCESSOR_ARCHITECTURE shell=PowerShell mode=$Mode"
Write-Host "targets: python=$PythonTarget node=$NodeTarget uv=$UvTarget"

Ensure-Git
Ensure-Uv
Ensure-Python
if (-not $BackendOnly) {
    Ensure-Node
    Ensure-Docker
}
Invoke-WorkspaceCheck
Sync-ProjectIfReady
if ($FullCheck) { Invoke-FullChecks }

if ($Blocked -gt 0) {
    Write-Error "RESULT: BLOCKED ($Blocked issue(s))"
    exit 2
}
if ($BackendOnly) { Write-Host "RESULT: READY (backend tools/manifests; frontend and Docker not requested)" }
elseif ($G0Pending) { Write-Host "RESULT: PROVISIONAL (host tools ready; waiting for W3 G0 manifests)" }
else { Write-Host "RESULT: READY" }
