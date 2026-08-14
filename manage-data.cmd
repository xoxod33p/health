@echo off
setlocal

set "ROOT=%~dp0"

:menu
cls
echo ============================================================
echo  CareSignal Healthcare Platform - Database Management
echo ============================================================
echo.
echo  [1] Seed Demo Healthcare Data
echo  [2] Wipe Seed Data (Keep Protected Root Admin)
echo  [3] Reset Database and Re-Seed Fresh Data
echo  [4] Exit
echo.
echo ============================================================
set /p CHOICE="Select an option (1-4): "

if "%CHOICE%"=="1" goto do_seed
if "%CHOICE%"=="2" goto do_clean
if "%CHOICE%"=="3" goto do_reset
if "%CHOICE%"=="4" goto do_exit

echo Invalid selection. Please choose 1, 2, 3, or 4.
pause
goto menu

:do_seed
echo.
echo Running Seed Script...
call npx tsx "%ROOT%apps\api\src\scripts\seed.ts"
echo.
pause
goto menu

:do_clean
echo.
echo Running Clean Script...
call npx tsx "%ROOT%apps\api\src\scripts\clean.ts"
echo.
pause
goto menu

:do_reset
echo.
echo Resetting database and re-seeding...
call npx tsx "%ROOT%apps\api\src\scripts\clean.ts"
call npx tsx "%ROOT%apps\api\src\scripts\bootstrap-admin.ts"
call npx tsx "%ROOT%apps\api\src\scripts\seed.ts"
echo.
pause
goto menu

:do_exit
echo.
echo Exiting.
endlocal
