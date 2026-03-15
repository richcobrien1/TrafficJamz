@echo off
echo ========================================
echo TrafficJamz - Complete Fresh Build
echo (Clean build + Fresh install + Clear cache)
echo ========================================
echo.

REM Step 1: Clean build
echo STEP 1: Building fresh APK...
echo ----------------------------------------
call rebuild-android-clean.bat
if errorlevel 1 (
    echo Build failed! Stopping here.
    pause
    exit /b 1
)

echo.
echo.
echo STEP 2: Installing fresh on device...
echo ========================================
call install-android-fresh.bat

echo.
echo ========================================
echo ALL DONE!
echo ========================================
echo.
echo You now have a completely fresh build with:
echo   - Clean build cache
echo   - Latest code (v1.0.1)
echo   - No cached WebView data
echo   - Fresh login dialog from Clerk
echo.

pause
