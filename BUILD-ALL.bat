@echo off
echo ========================================
echo BUILDING TRAFFICJAMZ v1.0.12
echo ========================================
echo.

cd jamz-client-vite

echo [1/5] Building web app...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Build failed!
    pause
    exit /b 1
)

echo.
echo [2/5] Building Electron app for Windows...
call npm run build:electron
if %errorlevel% neq 0 (
    echo ERROR: Electron build failed!
    pause
    exit /b 1
)

echo.
echo [3/5] Packaging Windows installer...
call node scripts\build-electron-win.cjs
if %errorlevel% neq 0 (
    echo ERROR: Windows packaging failed!
    pause
    exit /b 1
)

echo.
echo [4/5] Syncing with Android...
call npx cap sync android
if %errorlevel% neq 0 (
    echo ERROR: Capacitor sync failed!
    pause
    exit /b 1
)

echo.
echo [5/5] Building Android APK...
cd android
call gradlew assembleDebug
if %errorlevel% neq 0 (
    echo ERROR: Android build failed!
    cd ..
    pause
    exit /b 1
)
cd ..

echo.
echo ========================================
echo BUILD COMPLETE!
echo ========================================
echo.
echo Windows Installer: dist-electron\TrafficJamz Setup 1.0.12.exe
echo Android APK: android\app\build\outputs\apk\debug\app-debug.apk
echo.
pause
