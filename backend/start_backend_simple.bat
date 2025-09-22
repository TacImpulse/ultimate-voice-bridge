@echo off
title Ultimate Voice Bridge Backend with LLM
color 0A
echo ========================================
echo  Ultimate Voice Bridge Backend
echo  with OSS36B LLM Integration
echo ========================================
echo.
echo Starting backend server...
echo Backend will run on: http://localhost:8001
echo.
echo STT: RTX 5090 GPU acceleration
echo LLM: OSS36B via LM Studio
echo.
echo Press Ctrl+C to stop the backend
echo ========================================
echo.

cd /d "C:\Users\TacIm\ultimate-voice-bridge\backend"
python voice_main.py

pause