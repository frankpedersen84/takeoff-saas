@echo off
title TakeoffAI Setup
color 0E

echo.
echo  ========================================
echo       TakeoffAI - First Time Setup
echo  ========================================
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] Node.js is not installed.
    echo.
    echo Opening Node.js download page...
    echo Please install the LTS version.
    echo.
    start https://nodejs.org
    echo After installing Node.js, run this setup again.
    pause
    exit /b 1
)

echo [OK] Node.js is installed
node --version
echo.

:: Create .env file
echo [*] Setting up configuration...
echo.

if exist ".env" (
    echo [!] Configuration file already exists.
    set /p overwrite="Do you want to reconfigure? (y/n): "
    if /i not "%overwrite%"=="y" goto :install_deps
)

echo.
echo ==========================================
echo  API KEY SETUP
echo ==========================================
echo.
echo You need an Anthropic API key to use TakeoffAI.
echo Get one at: https://console.anthropic.com
echo.
set /p apikey="Enter your Anthropic API key: "

if "%apikey%"=="" (
    echo [ERROR] API key cannot be empty!
    pause
    exit /b 1
)

:: Write .env file
echo ANTHROPIC_API_KEY=%apikey%> .env
echo PORT=3001>> .env
echo NODE_ENV=development>> .env
echo FRONTEND_URL=http://localhost:5173>> .env
echo RATE_LIMIT_WINDOW_MS=60000>> .env
echo RATE_LIMIT_MAX_REQUESTS=30>> .env
echo MAX_FILE_SIZE_MB=50>> .env

echo.
echo [OK] Configuration saved!
echo.

:install_deps
:: Install dependencies
if not exist "node_modules" (
    echo [*] Installing dependencies...
    echo This may take 2-5 minutes on first run.
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo.
        echo [ERROR] Installation failed!
        pause
        exit /b 1
    )
    echo.
    echo [OK] Dependencies installed!
) else (
    echo [OK] Dependencies already installed.
)

echo.
echo ==========================================
echo  SETUP COMPLETE!
echo ==========================================
echo.
echo You can now run START.bat to launch TakeoffAI.
echo.
set /p launch="Launch TakeoffAI now? (y/n): "
if /i "%launch%"=="y" (
    call START.bat
)

pause
