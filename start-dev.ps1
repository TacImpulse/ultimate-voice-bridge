# Ultimate Voice Bridge - Warp Terminal Friendly Startup
# This script starts both servers in the same terminal session

Write-Host "🎤 Ultimate Voice Bridge - Development Setup" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Gray
Write-Host ""

# Check if we're in the right directory
if (!(Test-Path "frontend") -or !(Test-Path "backend")) {
    Write-Host "❌ Error: Please run this script from the ultimate-voice-bridge directory" -ForegroundColor Red
    exit 1
}

Write-Host "📋 Current Status Check:" -ForegroundColor White

# Check if backend is running
$backendRunning = $false
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8001/health" -Method GET -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        $backendRunning = $true
        Write-Host "   ✅ Backend: Already running on port 8001" -ForegroundColor Green
    }
} catch {
    Write-Host "   🔴 Backend: Not running" -ForegroundColor Red
}

# Check if frontend is running
$frontendRunning = $false
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -Method GET -TimeoutSec 5
    $frontendRunning = $true
    Write-Host "   ✅ Frontend: Already running on port 3000" -ForegroundColor Green
} catch {
    Write-Host "   🔴 Frontend: Not running" -ForegroundColor Red
}

Write-Host ""

if ($backendRunning -and $frontendRunning) {
    Write-Host "🚀 Both servers are already running!" -ForegroundColor Green
} elseif ($backendRunning -and !$frontendRunning) {
    Write-Host "🌐 Starting Frontend only..." -ForegroundColor Cyan
    Write-Host "   (Backend is already running)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "📍 Once started, visit:" -ForegroundColor Magenta
    Write-Host "   🎤 Voice Recording: http://localhost:3000/voice" -ForegroundColor Red
    Write-Host "   🏠 Main Page: http://localhost:3000" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Starting frontend server..." -ForegroundColor Yellow
    Set-Location "frontend"
    npm run dev
} elseif (!$backendRunning -and $frontendRunning) {
    Write-Host "🚀 Starting Backend only..." -ForegroundColor Yellow
    Write-Host "   (Frontend is already running)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Starting backend server with GPU support..." -ForegroundColor Yellow
    Set-Location "backend"
    python main.py
} else {
    Write-Host "⚠️  Neither server is running." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please start them manually in separate terminal tabs:" -ForegroundColor White
    Write-Host ""
    Write-Host "Tab 1 - Backend (RTX 5090):" -ForegroundColor Yellow
    Write-Host "   cd backend" -ForegroundColor Gray
    Write-Host "   python main.py" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Tab 2 - Frontend:" -ForegroundColor Cyan
    Write-Host "   cd frontend" -ForegroundColor Gray
    Write-Host "   npm run dev" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Then visit: http://localhost:3000/voice 🎤" -ForegroundColor Magenta
}