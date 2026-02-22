$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

Write-Host "`n=== Stopping existing services ===" -ForegroundColor Yellow

Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | ForEach-Object {
    $proc = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue
    if ($proc) {
        Write-Host "  Killing $($proc.ProcessName) (PID $($proc.Id)) on port 8000" -ForegroundColor Gray
        Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    }
}

foreach ($port in @(3000, 3001)) {
    Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | ForEach-Object {
        $proc = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue
        if ($proc) {
            Write-Host "  Killing $($proc.ProcessName) (PID $($proc.Id)) on port $port" -ForegroundColor Gray
            Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
        }
    }
}

Start-Sleep -Seconds 1
Write-Host "  Done." -ForegroundColor Gray

Write-Host "`n=== Installing backend dependencies ===" -ForegroundColor Cyan
Set-Location "$root\backend"
pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) { Write-Host "Backend pip install failed" -ForegroundColor Red; exit 1 }

Write-Host "`n=== Installing frontend dependencies ===" -ForegroundColor Cyan
Set-Location $root
npm install
if ($LASTEXITCODE -ne 0) { Write-Host "npm install failed" -ForegroundColor Red; exit 1 }

Write-Host "`n=== Building onboarding app ===" -ForegroundColor Cyan
npm run build:onboarding
if ($LASTEXITCODE -ne 0) { Write-Host "Onboarding build failed" -ForegroundColor Red; exit 1 }

Write-Host "`n=== Installing admin dashboard dependencies ===" -ForegroundColor Cyan
Set-Location "$root\quantro-main"
npm install
if ($LASTEXITCODE -ne 0) { Write-Host "Admin npm install failed" -ForegroundColor Red; exit 1 }

Write-Host "`n=== Building admin dashboard ===" -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "Admin build failed" -ForegroundColor Red; exit 1 }

Set-Location $root

Write-Host "`n=== Starting backend (FastAPI on port 8000) ===" -ForegroundColor Green
$backend = Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\backend'; python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000" -PassThru

Start-Sleep -Seconds 2

Write-Host "=== Starting Express server (port 3001) ===" -ForegroundColor Green
$frontend = Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root'; node app.js" -PassThru

Write-Host "`n=== All services started ===" -ForegroundColor Yellow
Write-Host "  Backend API:   http://127.0.0.1:8000" -ForegroundColor White
Write-Host "  Express site:  http://localhost:3001" -ForegroundColor White
Write-Host "  Onboarding:    http://localhost:3001/onboarding" -ForegroundColor White
Write-Host "  Admin panel:   http://localhost:3001/admin" -ForegroundColor White
Write-Host "`nTwo new terminal windows have been opened for the servers." -ForegroundColor Gray
Write-Host "Close them to stop the services.`n" -ForegroundColor Gray
