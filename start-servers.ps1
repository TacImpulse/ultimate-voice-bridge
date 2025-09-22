# Ultimate Voice Bridge - Development Server Startup Script
# This script starts both frontend and backend servers

Write-Host "🎤 Starting Ultimate Voice Bridge Development Servers..." -ForegroundColor Green
Write-Host ""

# Check if we're in the right directory
if (!(Test-Path "frontend") -or !(Test-Path "backend")) {
    Write-Host "❌ Error: Please run this script from the ultimate-voice-bridge directory" -ForegroundColor Red
    exit 1
}

# Start backend server in a new PowerShell window
Write-Host "🚀 Starting Backend (FastAPI with RTX 5090)..." -ForegroundColor Yellow
$backendPath = (Get-Location).Path + "\backend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; python main.py"

# Wait a moment for backend to start
Start-Sleep -Seconds 3

# Start frontend server in a new PowerShell window  
Write-Host "🌐 Starting Frontend (Next.js)..." -ForegroundColor Cyan
$frontendPath = (Get-Location).Path + "\frontend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; npm run dev"

Write-Host ""
Write-Host "✅ Servers are starting up!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Access Points:" -ForegroundColor White
Write-Host "   Frontend:     http://localhost:3001" -ForegroundColor Cyan
Write-Host "   Voice App:    http://localhost:3001/voice" -ForegroundColor Red  
Write-Host "   Backend API:  http://localhost:8001" -ForegroundColor Yellow
Write-Host "   API Docs:     http://localhost:8001/docs" -ForegroundColor Blue
Write-Host ""
Write-Host "🎯 Pro Tip: Open http://localhost:3001/voice to test your RTX 5090 voice recording!" -ForegroundColor Magenta
Write-Host ""
Write-Host "Press any key to exit this window..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")