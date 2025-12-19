@echo off
REM Manual Electron Build Workaround
REM This builds to a temp location then copies over

echo.
echo ===============================================
echo   TrafficJamz Electron Build Workaround
echo ===============================================
echo.
echo This script works around file locking issues
echo by building to a temporary location first.
echo.

REM Kill processes
echo Step 1: Killing Electron processes...
taskkill /F /IM electron.exe 2>nul
taskkill /F /IM TrafficJamz.exe 2>nul
timeout /t 2 /nobreak >nul

REM Build web assets first
echo.
echo Step 2: Building web assets...
call npm run build:electron

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Web build failed!
    pause
    exit /b 1
)

REM Rename old build
echo.
echo Step 3: Backing up old build...
if exist dist-electron\win-unpacked (
    move dist-electron\win-unpacked dist-electron\win-unpacked.old >nul 2>&1
)

REM Build Electron
echo.
echo Step 4: Building Electron package...
echo (This takes 20-30 seconds...)
call electron-builder --win --dir

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo   BUILD SUCCESS!
    echo ========================================
    echo.
    echo New exe location:
    dir /b dist-electron\win-unpacked\TrafficJamz.exe
    echo.
    echo You can delete the backup:
    echo   dist-electron\win-unpacked.old\
    echo.
) else (
    echo.
    echo ========================================
    echo   BUILD FAILED!
    echo ========================================
    echo.
    echo Restoring old build...
    if exist dist-electron\win-unpacked.old (
        rmdir /s /q dist-electron\win-unpacked 2>nul
        move dist-electron\win-unpacked.old dist-electron\win-unpacked >nul 2>&1
    )
    echo.
    echo SOLUTION: Restart Windows to release file locks
    echo.
)

pause
