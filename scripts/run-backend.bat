@echo off
title Biometric Vault — Backend API
echo  === STARTING BACKEND API SERVER ===
echo.
cd /d "%~dp0..\backend"
call "%~dp0..\.venv\Scripts\activate.bat"
set "TMPDIR=C:\tmp"
set "TEMP=C:\tmp"
set "TMP=C:\tmp"
mkdir C:\tmp 2>nul
echo Installing dependencies (if any updates)...
pip install -r requirements.txt --extra-index-url https://abetlen.github.io/llama-cpp-python/whl/cpu --quiet
echo.
echo Starting FastAPI application with Uvicorn...
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
pause
