@echo off
echo ========================================
echo REBUILD WITH MANUAL ICON FIX
echo ========================================
cd /d C:\Users\richc\Projects\TrafficJamz\jamz-client-vite

echo.
echo Step 1: Package with electron-builder (no afterPack hook)...
node scripts\build-electron-win.cjs
if %errorlevel% neq 0 (
    echo ERROR: Build failed!
    pause
    exit /b 1
)

echo.
echo Step 2: Manually embed icon into the unpacked exe...
node_modules\rcedit\bin\rcedit.exe "dist-electron\win-unpacked\TrafficJamz.exe" --set-icon "build\icon.ico"
if %errorlevel% equ 0 (
    echo ✓ Icon embedded in unpacked exe
) else (
    echo ✗ Icon embedding FAILED!
    pause
    exit /b 1
)

echo.
echo Step 3: Rebuild NSIS installer with icon-embedded exe...
echo Re-running electron-builder to recreate installer...
node scripts\build-electron-win.cjs
if %errorlevel% neq 0 (
    echo ERROR: Installer rebuild failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo BUILD COMPLETE!
echo ========================================
echo.
echo Installer: dist-electron\TrafficJamz Setup 1.0.12.exe
echo.
pause

explorer dist-electron
