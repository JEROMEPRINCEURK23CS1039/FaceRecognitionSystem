@echo off
title Biometric Vault — Frontend UI
echo  === STARTING FRONTEND DEV SERVER ===
echo.
cd /d "%~dp0..\frontend"
set "VITE_API_BASE=http://127.0.0.1:8000/api"
echo Starting Vite Dev Server...
call npm run dev
pause
