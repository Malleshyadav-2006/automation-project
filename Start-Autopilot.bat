@echo off
setlocal
echo ========================================================
echo        Starting Outreach Autopilot (Local Engine)
echo ========================================================

echo.
echo 📱 MOBILE ACCESS SETUP:
echo To access the dashboard from your phone, connect your phone
echo to the same Wi-Fi and open one of these IP addresses:
for /f "tokens=14" %%a in ('ipconfig ^| findstr IPv4') do echo - http://%%a:5173
echo.

echo Starting Backend Server (Port 5000)...
start cmd /k "cd backend && node index.js"

echo Starting Frontend Server...
start cmd /k "cd frontend && npm run dev -- --open"

echo.
echo ✅ Engine is warming up! 
echo Your browser will open the Dashboard automatically in a few seconds.
echo Please leave the new black terminal windows open to keep the engine running!
echo.
pause
