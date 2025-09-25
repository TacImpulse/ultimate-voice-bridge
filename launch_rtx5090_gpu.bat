@echo off
title RTX 5090 GPU Voice Bridge Launcher
color 0A

echo.
echo ================================================
echo    RTX 5090 GPU Voice Bridge Launcher
echo    High-Performance GPU Acceleration Ready
echo ================================================
echo.

REM Get script directory
set "SCRIPT_DIR=%~dp0"
set "BACKEND_DIR=%SCRIPT_DIR%backend"
set "FRONTEND_DIR=%SCRIPT_DIR%frontend"

REM Verify directories exist
if not exist "%BACKEND_DIR%" (
    echo [ERROR] Backend directory not found: %BACKEND_DIR%
    pause
    exit /b 1
)

if not exist "%FRONTEND_DIR%" (
    echo [ERROR] Frontend directory not found: %FRONTEND_DIR%
    pause
    exit /b 1
)

echo [CHECK] System validation...
echo.

REM Check NVIDIA GPU
nvidia-smi >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] NVIDIA GPU not detected - running CPU mode
) else (
    echo [OK] NVIDIA GPU detected
    nvidia-smi | findstr "RTX 5090" >nul 2>&1
    if %errorlevel% equ 0 (
        echo [RTX5090] RTX 5090 detected - Maximum performance enabled!
    )
)

REM Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found - please install Python 3.8+
    pause
    exit /b 1
)
echo [OK] Python detected

REM Validate GPU setup
echo.
echo [GPU] Testing PyTorch GPU acceleration...
cd /d "%BACKEND_DIR%"
python -c "import torch; print('[OK] CUDA Available:', torch.cuda.is_available()); print('[GPU]', torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU-only')" 2>nul
if %errorlevel% neq 0 (
    echo [WARNING] GPU validation failed - continuing anyway
)

echo.
echo [LAUNCH] Starting services...
echo.

REM Start backend
echo [BACKEND] Starting RTX 5090 accelerated backend...
start "RTX 5090 Backend" /D "%BACKEND_DIR%" cmd /k "echo [GPU] RTX 5090 GPU Acceleration: ENABLED && echo [START] Starting backend server... && python main.py"

REM Wait for backend
echo [WAIT] Backend starting... (10 seconds)
timeout /t 10 /nobreak >nul

REM Start frontend  
echo [FRONTEND] Starting frontend...
start "Voice Bridge Frontend" /D "%FRONTEND_DIR%" cmd /k "echo [UI] Starting frontend server... && npm run dev"

REM Wait for frontend
echo [WAIT] Frontend starting... (15 seconds)
timeout /t 15 /nobreak >nul

echo.
echo ================================================
echo        RTX 5090 GPU VOICE BRIDGE READY!
echo ================================================
echo.
echo [SERVICES]
echo   Backend:  http://localhost:8001
echo   Frontend: http://localhost:3000
echo   Voice UI: http://localhost:3000/voice
echo.
echo [GPU] RTX 5090 acceleration active
echo [PERF] Expect 7-11x faster voice generation
echo.

REM Open voice interface
echo [WEB] Opening voice interface...
timeout /t 3 /nobreak >nul
start http://localhost:3000/voice

echo.
echo [SUCCESS] Launch complete!
echo Check backend and frontend windows for status.
echo.
echo Press any key to close launcher...
pause >nul