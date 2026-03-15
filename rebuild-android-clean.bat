@echo off
echo ========================================
echo TrafficJamz - CLEAN Android APK Build
echo ========================================
echo.

echo [1/5] Cleaning Android build cache...
cd mobile\Android
call gradlew.bat clean
if errorlevel 1 (
    echo Error: Gradle clean failed
    pause
    exit /b 1
)
cd ..\..
echo Done!
echo.

echo [2/5] Building web application...
cd jamz-client-vite
call npm run build
if errorlevel 1 (
    echo Error: Web build failed
    pause
    exit /b 1
)
cd ..
echo Done!
echo.

echo [3/5] Syncing Capacitor...
call npx cap sync android
if errorlevel 1 (
    echo Error: Capacitor sync failed
    pause
    exit /b 1
)
echo Done!
echo.

echo [4/5] Building debug APK...
cd mobile\Android
call gradlew.bat assembleDebug
if errorlevel 1 (
    echo Error: APK build failed
    pause
    exit /b 1
)
cd ..\..
echo Done!
echo.

echo [5/5] Getting APK info...
for %%A in (mobile\Android\app\build\outputs\apk\debug\app-debug.apk) do set size=%%~zA
set /a sizeMB=%size%/1048576

echo.
echo ========================================
echo CLEAN BUILD COMPLETE!
echo ========================================
echo.
echo APK Location: mobile\Android\app\build\outputs\apk\debug\app-debug.apk
echo APK Size: %size% bytes (%sizeMB% MB)
echo Build Time: %date% %time%
echo.
echo Installation Commands:
echo   USB (ADB): adb install -r mobile\Android\app\build\outputs\apk\debug\app-debug.apk
echo   Check device: adb devices
echo   Launch app: adb shell am start -n com.trafficjamz.app/.MainActivity
echo.

echo Opening output folder...
start explorer "mobile\Android\app\build\outputs\apk\debug"

pause
