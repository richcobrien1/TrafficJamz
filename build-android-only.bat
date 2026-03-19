@echo off
REM TrafficJamz - Build Android APK Only
REM Fast build for Android testing on Motorola Razr
REM Date: March 14, 2026

echo ========================================
echo TrafficJamz Android APK Build
echo ========================================
echo.

REM Navigate to jamz-client-vite directory
cd /d "%~dp0jamz-client-vite"

echo [1/4] Building web application...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Build failed
    pause
    exit /b 1
)
echo ✓ Build complete

echo.
echo [2/4] Syncing Capacitor...
call npx cap sync android
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Capacitor sync failed
    pause
    exit /b 1
)
echo ✓ Capacitor synced

echo.
echo [3/4] Building debug APK...
cd android
call gradlew.bat assembleDebug
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: APK build failed
    pause
    exit /b 1
)
echo ✓ Debug APK built

echo.
echo [4/4] Getting APK info...
call gradlew.bat :app:tasks --group=build >nul 2>&1

echo.
echo ========================================
echo BUILD COMPLETE!
echo ========================================
echo.
echo APK Location: jamz-client-vite\android\app\build\outputs\apk\debug\app-debug.apk
echo APK Size: 
for %%A in ("app\build\outputs\apk\debug\app-debug.apk") do echo   %%~zA bytes
echo.
echo Installation Commands:
echo   USB (ADB): adb install -r app\build\outputs\apk\debug\app-debug.apk
echo   Check device: adb devices
echo   Launch app: adb shell am start -n com.trafficjamz.app/.MainActivity
echo.
echo Opening output folder...
start app\build\outputs\apk\debug
echo.
pause
