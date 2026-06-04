@echo off
title Biometric Vault - Local Launcher
color 0B

echo.
echo  ╔══════════════════════════════════════════════════════════╗
echo  ║                                                          ║
echo  ║        BIOMETRIC VAULT PRO — LOCAL LAUNCHER              ║
echo  ║        Autonomous Neural Authentication System           ║
echo  ║                                                          ║
echo  ╚══════════════════════════════════════════════════════════╝
echo.

:: ─── Resolve project root (where this .bat lives) ───
set "PROJECT_ROOT=%~dp0"

:: ─── Check for Python virtual environment ───
if not exist "%PROJECT_ROOT%.venv\Scripts\activate.bat" (
    echo  [!] Virtual environment not found at .venv\
    echo      Creating virtual environment...
    python -m venv "%PROJECT_ROOT%.venv"
    if errorlevel 1 (
        echo  [ERROR] Failed to create virtual environment. Is Python installed?
        echo          Download from https://www.python.org/downloads/
        pause
        exit /b 1
    )
)

:: ─── Check for node_modules ───
if not exist "%PROJECT_ROOT%frontend\node_modules" (
    echo  [!] Frontend dependencies not installed. Running npm install...
    pushd "%PROJECT_ROOT%frontend"
    call npm install
    popd
    if errorlevel 1 (
        echo  [ERROR] npm install failed. Is Node.js installed?
        pause
        exit /b 1
    )
)

:: ─── 1. Start Python Backend (FastAPI + Uvicorn) ───
echo  [1/3] Starting Backend API server (port 8000)...
start "Biometric Vault — Backend API" cmd /c ""%PROJECT_ROOT%scripts\run-backend.bat""

:: Give backend a moment to initialise
timeout /t 4 /nobreak >nul

:: ─── 2. Start Vite Frontend Dev Server ───
echo  [2/3] Starting Frontend dev server (port 5173)...
start "Biometric Vault — Frontend UI" cmd /c ""%PROJECT_ROOT%scripts\run-frontend.bat""

:: ─── 3. Wait for frontend to be ready, then open browser ───
echo  [3/3] Waiting for servers to start...
echo.

:: Poll until the Vite dev server is accepting connections (max ~30s)
set ATTEMPTS=0
:wait_loop
if %ATTEMPTS% GEQ 15 (
    echo  [!] Timed out waiting for frontend — opening browser anyway...
    goto open_browser
)
timeout /t 2 /nobreak >nul
set /a ATTEMPTS+=1

:: Try to reach the dev server
powershell -NoProfile -Command "try { $null = Invoke-WebRequest -Uri 'http://localhost:5173' -UseBasicParsing -TimeoutSec 2; exit 0 } catch { exit 1 }" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo     Waiting... (%ATTEMPTS%/15)
    goto wait_loop
)

:open_browser
echo.
echo  ╔══════════════════════════════════════════════════════════╗
echo  ║  ALL SERVICES RUNNING!                                   ║
echo  ║                                                          ║
echo  ║  Backend API : http://127.0.0.1:8000                    ║
echo  ║  Frontend UI : http://localhost:5173                     ║
echo  ║  API Docs    : http://127.0.0.1:8000/docs               ║
echo  ║                                                          ║
echo  ║  Close the server windows to stop each service.          ║
echo  ╚══════════════════════════════════════════════════════════╝
echo.

:: Open the app in the default browser
start "" "http://localhost:5173"

echo  Browser opened. You can close this window.
echo.
pause
