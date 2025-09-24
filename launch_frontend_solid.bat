@echo off
title "Ultimate Voice Bridge Frontend - SOLID"
color 1F

echo =====================================
echo  Ultimate Voice Bridge Frontend
echo  Starting on PORT 3000
echo =====================================
echo.
echo Opening browser to http://localhost:3000
echo.

cd /d "C:\Users\TacIm\ultimate-voice-bridge\frontend"
start http://localhost:3000
npm run dev

pause