@echo off
title Biometric Vault - Stop Local Services
color 0C

echo.
echo  ╔══════════════════════════════════════════════════════════╗
echo  ║                                                          ║
echo  ║        BIOMETRIC VAULT PRO — STOP ALL LOCAL              ║
echo  ║                                                          ║
echo  ╚══════════════════════════════════════════════════════════╝
echo.

echo  Stopping Python/Uvicorn backend processes (and freeing LLM memory)...
:: Kill by port 8000
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
taskkill /F /IM python.exe /T >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Biometric Vault*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Biometric Vault — Backend API*" >nul 2>&1

echo  Stopping Node/Vite frontend processes...
:: Kill by port 5173
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Biometric Vault — Frontend UI*" >nul 2>&1

echo.
echo  All local services stopped.
echo.
pause
