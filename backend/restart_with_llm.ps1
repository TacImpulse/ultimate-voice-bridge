# Restart Ultimate Voice Bridge Backend with LLM Integration
Write-Host "🔄 Restarting Ultimate Voice Bridge with OSS36B LLM integration..." -ForegroundColor Cyan

# Stop existing Python processes
Write-Host "⏹️  Stopping existing backend..." -ForegroundColor Yellow
Get-Process -Name python -ErrorAction SilentlyContinue | Stop-Process -Force

# Wait a moment for cleanup
Start-Sleep -Seconds 2

# Start the backend with LLM integration
Write-Host "🚀 Starting backend with LM Studio integration..." -ForegroundColor Green
python voice_main.py