@echo off
echo ========================================
echo FINAL ICON FIX - Complete Rebuild
echo ========================================
cd /d C:\Users\richc\Projects\TrafficJamz\jamz-client-vite

echo.
echo [1/3] Building web app...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Web build failed!
    pause
    exit /b 1
)

echo.
echo [2/3] Building Electron...
call npm run build:electron
if %errorlevel% neq 0 (
    echo ERROR: Electron build failed!
    pause
    exit /b 1
)

echo.
echo [3/3] Packaging with electron-builder...
echo (Watch for "🎨 EMBEDDING ICON INTO EXE" message)
echo.
node scripts\build-electron-win.cjs
if %errorlevel% neq 0 (
    echo ERROR: Packaging failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo BUILD COMPLETE!
echo ========================================
echo.
echo If you saw "✅ ICON EMBEDDED SUCCESSFULLY!" above,
echo the icon is now properly embedded.
echo.
echo Next: Uninstall old version and reinstall
echo.
pause

explorer dist-electron
