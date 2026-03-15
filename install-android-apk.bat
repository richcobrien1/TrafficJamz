@echo off
REM TrafficJamz - Install APK to Android Device
REM For Motorola Razr or any Android device
REM Date: March 14, 2026

echo ========================================
echo TrafficJamz APK Installer
echo ========================================
echo.

set APK_PATH=TrafficJamz-RealData-Test-Mar14.apk

REM Check if APK exists
if not exist "%APK_PATH%" (
    echo ERROR: APK not found at %APK_PATH%
    echo Please build the APK first using build-android-only.bat
    pause
    exit /b 1
)

echo Checking connected devices...
adb devices
echo.

echo Installing APK to connected device(s)...
echo.
adb install -r "%APK_PATH%"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo ✓ APK INSTALLED SUCCESSFULLY!
    echo ========================================
    echo.
    echo Launching TrafficJamz on device...
    adb shell am start -n com.trafficjamz.app/.MainActivity
    echo.
    echo View logs:
    echo   adb logcat -s Capacitor:* TrafficJamz:*
    echo.
    echo Uninstall:
    echo   adb uninstall com.trafficjamz.app
    echo.
) else (
    echo.
    echo ========================================
    echo ✗ INSTALLATION FAILED
    echo ========================================
    echo.
    echo Common issues:
    echo   1. USB Debugging not enabled on phone
    echo   2. No device connected via USB
    echo   3. ADB not in PATH (install Android SDK Platform Tools)
    echo.
    echo To enable USB Debugging on Motorola Razr:
    echo   1. Go to Settings ^> About Phone
    echo   2. Tap Build Number 7 times to enable Developer Options
    echo   3. Go to Settings ^> System ^> Developer Options
    echo   4. Enable USB Debugging
    echo   5. Connect phone via USB and accept the prompt
    echo.
)

pause
