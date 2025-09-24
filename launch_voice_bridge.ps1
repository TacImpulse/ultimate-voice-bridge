# Ultimate Voice Bridge Launcher - PowerShell Version
# This script launches both backend and frontend services

param(
    [switch]$NoWait = $false
)

# Set window title and colors
$Host.UI.RawUI.WindowTitle = "Ultimate Voice Bridge Launcher"
Write-Host ""
Write-Host "=====================================" -ForegroundColor Green
Write-Host "   🎙️ Ultimate Voice Bridge Launcher" -ForegroundColor Green  
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""
Write-Host "Starting backend and frontend services..." -ForegroundColor Yellow
Write-Host ""

# Get script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Join-Path $ScriptDir "backend"
$FrontendDir = Join-Path $ScriptDir "frontend"

# Check if directories exist
if (-not (Test-Path $BackendDir)) {
    Write-Host "❌ ERROR: Backend directory not found at $BackendDir" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

if (-not (Test-Path $FrontendDir)) {
    Write-Host "❌ ERROR: Frontend directory not found at $FrontendDir" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Kill any existing python processes to avoid conflicts
Write-Host "🧹 Cleaning up any existing processes..." -ForegroundColor Cyan
Get-Process python* -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process node* -ErrorAction SilentlyContinue | Where-Object { $_.ProcessName -match "node" -and $_.CommandLine -match "next-dev" } | Stop-Process -Force -ErrorAction SilentlyContinue

Start-Sleep -Seconds 2

Write-Host "🚀 Starting Backend Service..." -ForegroundColor Green
Write-Host "   Location: $BackendDir" -ForegroundColor Gray
Write-Host "   Command: python main.py" -ForegroundColor Gray
Write-Host ""

# Start backend
try {
    $backendProcess = Start-Process -FilePath "python" -ArgumentList "main.py" -WorkingDirectory $BackendDir -WindowStyle Normal -PassThru
    Write-Host "✅ Backend process started (PID: $($backendProcess.Id))" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to start backend: $_" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Wait for backend to initialize
Write-Host "⏳ Waiting for backend to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 8

Write-Host "🌐 Starting Frontend Service..." -ForegroundColor Green
Write-Host "   Location: $FrontendDir" -ForegroundColor Gray
Write-Host "   Command: npm run dev" -ForegroundColor Gray
Write-Host ""

# Start frontend
try {
    $frontendProcess = Start-Process -FilePath "npm" -ArgumentList "run", "dev" -WorkingDirectory $FrontendDir -WindowStyle Normal -PassThru
    Write-Host "✅ Frontend process started (PID: $($frontendProcess.Id))" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to start frontend: $_" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Wait for frontend to build
Write-Host "⏳ Waiting for frontend to build..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host ""
Write-Host "✅ Services are starting..." -ForegroundColor Green
Write-Host ""
Write-Host "🔧 Backend:  http://localhost:8001" -ForegroundColor Cyan
Write-Host "🎨 Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "📱 Your voice chat will be available at:" -ForegroundColor Yellow
Write-Host "   👉 http://localhost:3000/voice" -ForegroundColor White -BackgroundColor DarkBlue
Write-Host ""

Write-Host "💡 Tips:" -ForegroundColor Yellow
Write-Host "   • Wait 15-20 seconds for services to fully load" -ForegroundColor Gray
Write-Host "   • Look for 'Ultimate Voice Bridge is ready!' in backend window" -ForegroundColor Gray  
Write-Host "   • Look for 'Ready in' message in frontend window" -ForegroundColor Gray
Write-Host "   • Both services will run in separate windows" -ForegroundColor Gray
Write-Host ""

# Test if services are responding
Write-Host "🔍 Testing backend connection..." -ForegroundColor Yellow
$maxAttempts = 6
$attempt = 0
$backendReady = $false

while ($attempt -lt $maxAttempts -and -not $backendReady) {
    $attempt++
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8001/health" -TimeoutSec 5 -ErrorAction Stop
        $backendReady = $true
        Write-Host "✅ Backend is responding!" -ForegroundColor Green
    } catch {
        Write-Host "⏳ Attempt $attempt/$maxAttempts - Backend not ready yet..." -ForegroundColor Yellow
        Start-Sleep -Seconds 5
    }
}

if ($backendReady) {
    Write-Host "🌐 Opening Voice Bridge in your browser..." -ForegroundColor Green
    Start-Process "http://localhost:3000/voice"
    
    Write-Host ""
    Write-Host "🎉 Ultimate Voice Bridge is ready!" -ForegroundColor Green -BackgroundColor DarkGreen
    Write-Host ""
    Write-Host "📊 Process Information:" -ForegroundColor Cyan
    Write-Host "   Backend PID:  $($backendProcess.Id)" -ForegroundColor Gray
    Write-Host "   Frontend PID: $($frontendProcess.Id)" -ForegroundColor Gray
} else {
    Write-Host "⚠️ Backend may still be starting up. Check the backend window." -ForegroundColor Yellow
}

Write-Host ""
if (-not $NoWait) {
    Write-Host "Press any key to close this launcher window..." -ForegroundColor Cyan
    Write-Host "(Backend and frontend will continue running)" -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}