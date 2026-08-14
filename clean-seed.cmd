@echo off
setlocal

set "ROOT=%~dp0"

echo ============================================================
echo  CareSignal Healthcare Platform - Data Cleaner
echo ============================================================
echo.
echo WARNING: This will permanently delete all seeded patients,
echo sensors, types, assignments, replacements, reports, and non-root users.
echo.
set /p CONFIRM="Are you sure you want to proceed? (Y/N): "
if /i not "%CONFIRM%"=="Y" (
  echo Operation cancelled.
  exit /b 0
)

echo.
call npx tsx "%ROOT%apps\api\src\scripts\clean.ts"

if errorlevel 1 (
  echo.
  echo [ERROR] Clean operation encountered an error.
  exit /b 1
)

echo.
echo Clean operation complete!
endlocal
