@echo off
title Ultimate Voice Bridge - Clean Start
color 0A

echo ========================================
echo  Ultimate Voice Bridge Backend
echo  Starting with XML filtering...
echo ========================================
echo.

cd /d "C:\Users\TacIm\ultimate-voice-bridge\backend"

REM Kill any existing processes
taskkill /f /im python.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo Starting backend on http://localhost:8001...
echo.

uvicorn main:app --host 0.0.0.0 --port 8001 --reload

pause