@echo off
echo ========================================
echo TrafficJamz - Fresh Android Install
echo (Uninstalls old app and clears cache)
echo ========================================
echo.

set APK_PATH=mobile\Android\app\build\outputs\apk\debug\app-debug.apk
set PACKAGE_NAME=com.trafficjamz.app

echo [1/5] Checking ADB connection...
adb devices | findstr "device"
if errorlevel 1 (
    echo.
    echo ERROR: No Android device detected!
    echo.
    echo Make sure:
    echo   1. Phone is connected via USB
    echo   2. USB Debugging is enabled
    echo   3. You've authorized this computer on the phone
    echo.
    pause
    exit /b 1
)
echo Device connected!
echo.

echo [2/5] Uninstalling old app (if exists)...
adb uninstall %PACKAGE_NAME% 2>nul
echo Done! (OK if app wasn't installed)
echo.

echo [3/5] Clearing any cached data...
adb shell pm clear %PACKAGE_NAME% 2>nul
echo Done!
echo.

echo [4/5] Installing fresh APK...
if not exist "%APK_PATH%" (
    echo ERROR: APK not found at %APK_PATH%
    echo Please build the APK first using rebuild-android-clean.bat
    pause
    exit /b 1
)

adb install -r "%APK_PATH%"
if errorlevel 1 (
    echo.
    echo ERROR: Installation failed!
    echo.
    echo Try these troubleshooting steps:
    echo   1. Disconnect and reconnect your phone
    echo   2. Disable and re-enable USB Debugging
    echo   3. Run: adb kill-server ^&^& adb start-server
    echo   4. Check phone for installation prompt
    echo.
    pause
    exit /b 1
)
echo Installation successful!
echo.

echo [5/5] Launching app...
adb shell am start -n %PACKAGE_NAME%/.MainActivity
echo.

echo ========================================
echo FRESH INSTALL COMPLETE!
echo ========================================
echo.
echo The app is now running with completely fresh data.
echo No cached login dialogs or old code.
echo.
echo To debug if issues persist:
echo   1. Connect phone via USB
echo   2. Open Chrome and go to: chrome://inspect
echo   3. Find "%PACKAGE_NAME%" WebView
echo   4. Click "inspect" to see console errors
echo.

pause
