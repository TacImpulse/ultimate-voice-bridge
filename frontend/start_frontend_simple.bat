@echo off
title Ultimate Voice Bridge Frontend
color 0B
echo ========================================
echo  Ultimate Voice Bridge Frontend
echo  Next.js with Voice Recording
echo ========================================
echo.
echo Starting frontend server...
echo Frontend will run on: http://localhost:3000
echo Voice Recorder: http://localhost:3000/voice
echo.
echo Features:
echo - Real-time voice recording with animation
echo - RTX 5090 transcription
echo - OSS36B LLM integration
echo.
echo Press Ctrl+C to stop the frontend
echo ========================================
echo.

cd /d "C:\Users\TacIm\ultimate-voice-bridge\frontend"
npm run dev

pause