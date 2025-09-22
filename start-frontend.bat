@echo off
echo Starting Ultimate Voice Bridge Frontend...
cd /d "C:\Users\TacIm\ultimate-voice-bridge\frontend"
start "Voice Bridge Frontend" powershell -Command "Write-Host '🌐 Ultimate Voice Bridge Frontend' -ForegroundColor Cyan; Write-Host '=================================' -ForegroundColor Gray; Write-Host ''; Write-Host '🎤 Voice Recording: http://localhost:3000/voice' -ForegroundColor Red; Write-Host '🏠 Main Page: http://localhost:3000' -ForegroundColor Cyan; Write-Host ''; npm run dev; pause"