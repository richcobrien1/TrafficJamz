@echo off
echo ========================================
echo ICON FIX - NOW PROPERLY CONFIGURED!
echo ========================================
echo.
echo Changes made:
echo 1. afterPack hook ENABLED in electron-builder.yml
echo 2. electron-builder added to devDependencies
echo 3. rcedit added to devDependencies
echo.
echo The icon will now be embedded automatically!
echo.
pause

cd /d C:\Users\richc\Projects\TrafficJamz\jamz-client-vite

echo [1/2] Building web app...
call npm run build:electron
if %errorlevel% neq 0 (
    echo ERROR: Build failed!
    pause
    exit /b 1
)

echo.
echo [2/2] Packaging with electron-builder (with afterPack hook)...
echo Watch for "🎨 EMBEDDING ICON INTO EXE" message!
echo.
call npx electron-builder --win
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
echo the icon is now permanently fixed!
echo.
echo Next steps:
echo 1. Uninstall old TrafficJamz
echo 2. Install: jamz-client-vite\dist-electron\TrafficJamz Setup 1.0.12.exe
echo 3. Check desktop icon
echo 4. Launch app and check taskbar icon
echo.
pause
