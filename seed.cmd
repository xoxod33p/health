@echo off
setlocal

set "ROOT=%~dp0"

echo ============================================================
echo  CareSignal Healthcare Platform - Data Seeder
echo ============================================================
echo.

call npx tsx "%ROOT%apps\api\src\scripts\seed.ts"

if errorlevel 1 (
  echo.
  echo [ERROR] Seeding encountered an error.
  exit /b 1
)

echo.
echo Seeding complete!
endlocal
