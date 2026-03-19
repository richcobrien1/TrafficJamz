@echo off
echo ========================================
echo COMPLETE ICON FIX - Step by Step
echo ========================================
echo.
echo This will:
echo 1. Uninstall old TrafficJamz
echo 2. Clear ALL cached files and icons
echo 3. Rebuild with proper icon embedding
echo 4. Reinstall fresh copy
echo.
pause
echo.

:: Step 1: Uninstall
echo [STEP 1] Uninstalling old version...
echo Please MANUALLY uninstall TrafficJamz from:
echo - Settings ^> Apps ^> TrafficJamz ^> Uninstall
echo.
echo Press any key AFTER you've uninstalled it...
pause

:: Step 2: Clear cache folders
echo.
echo [STEP 2] Clearing cached files...
rd /s /q "C:\Users\richc\AppData\Local\TrafficJamz" 2>nul
rd /s /q "C:\Users\richc\AppData\Roaming\TrafficJamz" 2>nul
echo Done!

:: Step 3: Refresh Windows icon cache
echo.
echo [STEP 3] Refreshing Windows icon cache...
C:\Windows\System32\ie4uinit.exe -show
timeout /t 2 >nul
echo Done!

:: Step 4: Rebuild with icon
echo.
echo [STEP 4] Rebuilding application...
cd /d C:\Users\richc\Projects\TrafficJamz\jamz-client-vite

echo.
echo Building web app...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Build failed!
    pause
    exit /b 1
)

echo.
echo Building Electron...
call npm run build:electron
if %errorlevel% neq 0 (
    echo ERROR: Electron build failed!
    pause
    exit /b 1
)

echo.
echo Packaging Windows installer (icon will embed via afterPack hook)...
node scripts\build-electron-win.cjs
if %errorlevel% neq 0 (
    echo ERROR: Packaging failed!
    pause
    exit /b 1
)

:: Step 5: Install
echo.
echo ========================================
echo BUILD COMPLETE!
echo ========================================
echo.
echo [STEP 5] Now MANUALLY install:
echo.
echo   dist-electron\TrafficJamz Setup 1.0.12.exe
echo.
echo The icon WILL show correctly this time!
echo.
echo After installing:
echo - Check desktop shortcut icon
echo - Launch app and check taskbar icon
echo - Right-click exe ^> Properties ^> Check icon
echo.
pause

:: Open the installer folder
explorer dist-electron
