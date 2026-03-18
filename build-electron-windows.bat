@echo off
echo ========================================
echo TrafficJamz - Windows Build
echo ========================================
echo.
echo Building Electron app for Windows...
echo Icon will be automatically embedded!
echo.
pause

cd /d C:\Users\richc\Projects\TrafficJamz\jamz-client-vite

:: Build the app
echo [1/2] Building web app for Electron...
call npm run build:electron
if %errorlevel% neq 0 (
    echo.
    echo ❌ Build failed!
    pause
    exit /b 1
)

echo.
echo [2/2] Packaging with electron-builder...
echo.
echo Watch for these success messages:
echo   🎨 EMBEDDING ICON INTO EXE
echo   ✅ ICON EMBEDDED SUCCESSFULLY!
echo.
call npx electron-builder --win
if %errorlevel% neq 0 (
    echo.
    echo ❌ Packaging failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo ✅ BUILD COMPLETE!
echo ========================================
echo.
echo Installer created:
echo   dist-electron\TrafficJamz Setup 1.0.12.exe
echo.
echo Next steps:
echo 1. Uninstall old TrafficJamz (Settings ^> Apps)
echo 2. Install: dist-electron\TrafficJamz Setup 1.0.12.exe
echo 3. Verify icon shows on desktop and taskbar
echo.
pause
