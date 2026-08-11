@echo off
setlocal

set "ROOT=%~dp0"

if not exist "%ROOT%.env" (
  echo Creating .env from .env.example...
  copy /Y "%ROOT%.env.example" "%ROOT%.env" > nul
)

echo Starting Docker dependencies and waiting for them to become ready...
docker compose -f "%ROOT%infra\docker-compose.yml" up -d --wait
if errorlevel 1 (
  echo Docker dependencies failed to start. API and web windows were not opened.
  exit /b 1
)

start "Healthcare Infrastructure Logs" powershell.exe -NoExit -ExecutionPolicy Bypass -Command "Set-Location -LiteralPath '%ROOT%'; docker compose -f infra/docker-compose.yml logs -f"
start "Healthcare API" powershell.exe -NoExit -ExecutionPolicy Bypass -Command "Set-Location -LiteralPath '%ROOT%'; npm run dev:api"
start "Healthcare Web" powershell.exe -NoExit -ExecutionPolicy Bypass -Command "Set-Location -LiteralPath '%ROOT%'; npm run dev:web"

echo Docker dependencies are ready. Opened separate windows for infrastructure logs, API, and web.
endlocal