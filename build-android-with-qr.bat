@echo off
REM Build Android APK and generate QR code
REM This script builds the web app, syncs to Android, builds APK, and generates QR code

echo ========================================
echo TrafficJamz Android Build Pipeline
echo ========================================
echo.

REM Step 1: Build web app
echo [1/5] Building web application...
cd jamz-client-vite
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Web build failed!
    exit /b 1
)
echo.

REM Step 2: Sync to Android
echo [2/5] Syncing to Android platform...
call npx cap sync android
if %errorlevel% neq 0 (
    echo ERROR: Capacitor sync failed!
    exit /b 1
)
echo.

REM Step 3: Build Android APK
echo [3/5] Building Android APK...
cd ..\mobile\Android
call gradlew assembleDebug
if %errorlevel% neq 0 (
    echo ERROR: Android build failed!
    exit /b 1
)
echo.

REM Step 4: Copy APK with versioned name
echo [4/5] Copying APK files...
cd ..\..
set TODAY=%date:~10,4%%date:~4,2%%date:~7,2%
copy /Y "mobile\Android\app\build\outputs\apk\debug\app-debug.apk" "TrafficJamz-%TODAY%.apk"
copy /Y "TrafficJamz-%TODAY%.apk" "TrafficJamz.apk"
echo.

REM Step 5: Generate QR code
echo [5/5] Generating QR code...
call .venv\Scripts\activate.bat
python generate-apk-qr.py
echo.

echo ========================================
echo Build Complete!
echo ========================================
echo.
echo Versioned APK: TrafficJamz-%TODAY%.apk
echo Static APK:    TrafficJamz.apk
echo QR Code:       apk-qr-code.png
echo.
echo Next: Copy TrafficJamz.apk to server at jamz-server/downloads/
echo.
pause
