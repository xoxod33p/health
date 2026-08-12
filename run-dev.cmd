@echo off
setlocal

set "ROOT=%~dp0"

if not exist "%ROOT%.env" (
  echo Creating .env from .env.example...
  copy /Y "%ROOT%.env.example" "%ROOT%.env" > nul
)

echo Starting Docker infrastructure dependencies (MongoDB, Redis, MinIO)...
docker compose -f "%ROOT%infra\docker-compose.yml" up -d --wait
if errorlevel 1 (
  echo Docker dependencies failed to start. API and web windows were not opened.
  exit /b 1
)

echo Bootstrapping initial MongoDB admin account...
call npx tsx "%ROOT%apps\api\src\scripts\bootstrap-admin.ts"

echo Opening local development CMD windows for API and Web in DEV mode...
start "Healthcare API" cmd.exe /k "cd /d "%ROOT%" && set NODE_ENV=development && npm run dev:api"
start "Healthcare Web" cmd.exe /k "cd /d "%ROOT%" && set NODE_ENV=development && npm run dev:web"

echo ============================================================
echo Development environment ready!
echo  - Web UI: http://localhost:3000
echo  - API:    http://localhost:3001/api/v1
echo ============================================================
endlocal