@echo off
title Momentum Cockpit Launcher
echo Starting Momentum ADHD Productivity Cockpit...
cd /d "%~dp0"

:: Start the Vite server in the background
start /b cmd /c "npm run dev"

:: Wait 2 seconds for Vite to bind port 5173
timeout /t 2 /nobreak >nul

:: Launch in dedicated persistent standalone desktop window (MS Edge or Google Chrome)
where msedge >nul 2>nul
if %errorlevel% equ 0 (
    start msedge --app=http://localhost:5173 --window-size=1400,900 --user-data-dir="%LOCALAPPDATA%\MomentumCockpit"
    goto :done
)

where chrome >nul 2>nul
if %errorlevel% equ 0 (
    start chrome --app=http://localhost:5173 --window-size=1400,900 --user-data-dir="%LOCALAPPDATA%\MomentumCockpit"
    goto :done
)

:: Fallback if neither found in PATH
start http://localhost:5173

:done
echo Momentum is running in its dedicated desktop window.

