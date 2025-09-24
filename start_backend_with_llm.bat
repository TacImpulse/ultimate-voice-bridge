@echo off
color 0A
echo ================================
echo Ultimate Voice Bridge Backend
echo with LLM Integration (OSS36B)
echo ================================
echo.

REM Kill any existing python processes
echo Stopping existing backend processes...
taskkill /f /im python.exe >nul 2>&1
timeout /t 1 /nobreak >nul

echo Starting backend with LLM support...
echo.
echo Backend will open in a new visible PowerShell window.
echo Look for "Ultimate Voice Bridge Backend" in your taskbar.
echo.

REM Start in classic PowerShell (not Windows Terminal)
start "Ultimate Voice Bridge Backend" cmd /k "powershell -NoExit -Command \"cd 'C:\Users\TacIm\ultimate-voice-bridge\backend'; Write-Host '🚀 Ultimate Voice Bridge Backend with OSS36B LLM Integration' -ForegroundColor Green; Write-Host 'Backend running on http://localhost:8001' -ForegroundColor Yellow; python voice_main.py\""

echo Backend starting...
echo You can close this window now.
pause
