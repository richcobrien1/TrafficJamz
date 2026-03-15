@echo off
REM TrafficJamz - Build All Platforms
REM Builds Electron (Windows) and Android APK
REM Note: iOS requires macOS - use build-ios-only.sh on a Mac
REM Date: March 14, 2026

echo ========================================
echo TrafficJamz Multi-Platform Build Script
echo (Windows + Android - iOS requires macOS)
echo ========================================
echo.

REM Navigate to jamz-client-vite directory
cd /d "%~dp0jamz-client-vite"

echo [1/6] Checking prerequisites...
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: npm not found. Please install Node.js
    pause
    exit /b 1
)
echo ✓ npm found

echo.
echo [2/6] Building web application (production)...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Web build failed
    pause
    exit /b 1
)
echo ✓ Web build complete

echo.
echo [3/6] Syncing Capacitor Android...
call npx cap sync android
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Capacitor sync failed
    pause
    exit /b 1
)
echo ✓ Capacitor Android synced

echo.
echo [4/6] Building Android APK (Debug)...
cd ..\mobile\Android
call gradlew assembleDebug
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Android Debug build failed
    pause
    exit /b 1
)
echo ✓ Android Debug APK built

echo.
echo [5/6] Building Android APK (Release - unsigned)...
call gradlew assembleRelease
if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Android Release build failed (this is okay if you don't have signing keys)
    echo Continuing anyway...
)

echo.
echo [6/6] Building Electron (Windows)...
cd ..\..\jamz-client-vite
call npm run electron:build:win
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Electron build failed
    pause
    exit /b 1
)
echo ✓ Electron Windows build complete

echo.
echo ========================================
echo BUILD COMPLETE!
echo ========================================
echo.
echo Output locations:
echo   Android Debug APK: mobile\Android\app\build\outputs\apk\debug\app-debug.apk
echo   Android Release APK: mobile\Android\app\build\outputs\apk\release\app-release-unsigned.apk
echo   Electron Windows: jamz-client-vite\dist-electron\
echo.
echo To install on Motorola Razr:
echo   1. Connect phone via USB with USB Debugging enabled
echo   2. Run: adb install -r ..\mobile\Android\app\build\outputs\apk\debug\app-debug.apk
echo   3. Or copy APK to phone and install manually
echo.
pause
