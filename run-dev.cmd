@echo off
setlocal

set "ROOT=%~dp0"

if not exist "%ROOT%.env" (
  echo Creating .env from .env.example...
  copy /Y "%ROOT%.env.example" "%ROOT%.env" > nul
)

start "Healthcare Infrastructure" powershell.exe -NoExit -ExecutionPolicy Bypass -Command "Set-Location -LiteralPath '%ROOT%'; docker compose -f infra/docker-compose.yml up"
start "Healthcare API" powershell.exe -NoExit -ExecutionPolicy Bypass -Command "Set-Location -LiteralPath '%ROOT%'; npm run dev:api"
start "Healthcare Web" powershell.exe -NoExit -ExecutionPolicy Bypass -Command "Set-Location -LiteralPath '%ROOT%'; npm run dev:web"

echo Opened separate windows for infrastructure, API, and web.
endlocal