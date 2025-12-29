@echo off
cd /d "%~dp0"
title TakeoffAI Launcher
color 0A

echo.
echo  ========================================
echo       TakeoffAI - 3D Technology Services
echo  ========================================
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo.
    echo Please install Node.js from: https://nodejs.org
    echo Download the LTS version and run the installer.
    echo.
    start https://nodejs.org
    pause
    exit /b 1
)

echo [OK] Node.js found
node --version
echo.

:: Check if .env file exists
if not exist ".env" (
    echo [!] No .env file found. Running setup...
    if exist "SETUP.bat" (
        call SETUP.bat
        exit /b
    )
)

:: Check if node_modules exists
if not exist "node_modules" (
    echo [*] Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] npm install failed!
        pause
        exit /b 1
    )
)

echo [*] Starting TakeoffAI...
echo.
echo    Frontend: http://localhost:5173
echo    Backend:  http://localhost:3001
echo.
echo    Press Ctrl+C to stop the server.
echo.
echo ==========================================
echo.

:: Open browser after a short delay
start "" cmd /c "timeout /t 3 >nul && start http://localhost:5173"

:: Start the development server (this keeps the window open)
npm run dev

:: If we get here, something went wrong
echo.
echo [!] Server stopped unexpectedly.
pause
