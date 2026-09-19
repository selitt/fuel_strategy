$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
$Python = if (Test-Path ".venv\Scripts\python.exe") { ".venv\Scripts\python.exe" } else { "python" }
if (-not $env:FUEL_FRONTEND_DIR) {
    if (Test-Path "frontend\dist\index.html") { $env:FUEL_FRONTEND_DIR = Join-Path $PSScriptRoot "frontend\dist" }
    else {
        & $Python tools/verify_prebuilt.py
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
        $env:FUEL_FRONTEND_DIR = Join-Path $PSScriptRoot "frontend\prebuilt"
    }
}
$BindHost = if ($env:FUEL_BIND_HOST) { $env:FUEL_BIND_HOST } else { "127.0.0.1" }
$Port = if ($env:FUEL_WEB_PORT) { $env:FUEL_WEB_PORT } else { "8080" }
& $Python -m uvicorn src.app.web:create_web_app --factory --host $BindHost --port $Port --workers 1
exit $LASTEXITCODE
