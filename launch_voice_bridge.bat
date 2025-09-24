@echo off
title Ultimate Voice Bridge Launcher
color 0A

echo.
echo =====================================
echo    🎙️ Ultimate Voice Bridge Launcher
echo =====================================
echo.
echo Starting backend and frontend services...
echo.

REM Get the directory where this script is located
set "SCRIPT_DIR=%~dp0"
set "BACKEND_DIR=%SCRIPT_DIR%backend"
set "FRONTEND_DIR=%SCRIPT_DIR%frontend"

REM Check if directories exist
if not exist "%BACKEND_DIR%" (
    echo ❌ ERROR: Backend directory not found at %BACKEND_DIR%
    pause
    exit /b 1
)

if not exist "%FRONTEND_DIR%" (
    echo ❌ ERROR: Frontend directory not found at %FRONTEND_DIR%
    pause
    exit /b 1
)

echo 🚀 Starting Backend Service...
echo    Location: %BACKEND_DIR%
echo    Command: python main.py
echo.

REM Start backend in a new window
start "🔧 Voice Bridge Backend" /D "%BACKEND_DIR%" cmd /k "python main.py"

REM Wait a moment for backend to start
timeout /t 5 /nobreak >nul

echo 🌐 Starting Frontend Service...
echo    Location: %FRONTEND_DIR%
echo    Command: npm run dev
echo.

REM Start frontend in a new window  
start "🎨 Voice Bridge Frontend" /D "%FRONTEND_DIR%" cmd /k "npm run dev"

REM Wait a moment for frontend to start
timeout /t 8 /nobreak >nul

echo.
echo ✅ Services starting...
echo.
echo 🔧 Backend:  Starting on http://localhost:8001
echo 🎨 Frontend: Starting on http://localhost:3000
echo.
echo 📱 Your voice chat will be available at:
echo    👉 http://localhost:3000/voice
echo.
echo 💡 Tips:
echo    • Wait 10-15 seconds for services to fully load
echo    • Check the backend window for "🎙️ Ultimate Voice Bridge is ready!"
echo    • Check the frontend window for "Ready in" message
echo    • Close this window when done - services will keep running
echo.

REM Wait a bit more then try to open the browser
timeout /t 5 /nobreak >nul

echo 🌐 Opening Voice Bridge in your browser...
start http://localhost:3000/voice

echo.
echo 🎉 Ultimate Voice Bridge is launching!
echo.
echo Press any key to close this launcher window...
echo (Backend and frontend will continue running)
pause >nul