@echo off
REM TrafficJamz Electron Rebuild Script
REM This script ensures the Electron app is closed before rebuilding

echo Closing any running TrafficJamz instances...
taskkill /F /IM TrafficJamz.exe 2>nul
timeout /t 2 /nobreak >nul

echo.
echo Building Electron Windows application...
echo This will take 30-60 seconds...
echo.

call npm run electron:build:win

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo BUILD SUCCESS!
    echo ========================================
    echo.
    echo Electron app built to: dist-electron/win-unpacked/TrafficJamz.exe
    echo.
    echo You can now run the updated app.
    echo.
) else (
    echo.
    echo ========================================
    echo BUILD FAILED!
    echo ========================================
    echo.
    echo Make sure:
    echo   1. TrafficJamz.exe is completely closed
    echo   2. No node processes are running
    echo   3. You have enough disk space
    echo.
)

pause
