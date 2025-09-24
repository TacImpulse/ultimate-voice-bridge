@echo off
title "Ultimate Voice Bridge Backend - SOLID"
color 0F

REM Kill any existing python processes
echo Stopping existing processes...
taskkill /f /im python.exe >nul 2>&1
timeout /t 1 /nobreak >nul

echo =====================================
echo  Ultimate Voice Bridge Backend
echo  Starting on PORT 8001
echo =====================================
echo.

cd /d "C:\Users\TacIm\ultimate-voice-bridge\backend"
uvicorn main:app --host 0.0.0.0 --port 8001 --reload

pause