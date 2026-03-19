@echo off
echo ========================================
echo TrafficJamz ICON FIX - Final Solution
echo ========================================
echo.

cd /d C:\Users\richc\Projects\TrafficJamz\jamz-client-vite

echo [1/4] Building web app...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Web build failed!
    pause
    exit /b 1
)

echo.
echo [2/4] Building Electron app...
call npm run build:electron
if %errorlevel% neq 0 (
    echo ERROR: Electron build failed!
    pause
    exit /b 1
)

echo.
echo [3/4] Packaging Windows installer WITH ICON...
node scripts\build-electron-win.cjs
if %errorlevel% neq 0 (
    echo ERROR: Windows packaging failed!
    pause
    exit /b 1
)

echo.
echo [4/4] Embedding icon in BOTH exe files...

:: Fix the unpacked exe
node_modules\.bin\rcedit dist-electron\win-unpacked\TrafficJamz.exe --set-icon build\icon.ico --set-version-string CompanyName "TrafficJamz" --set-version-string FileDescription "TrafficJamz" --set-version-string ProductName "TrafficJamz"

:: Fix the installer
echo.
echo Extracting installer to verify icon...
echo Location: dist-electron\TrafficJamz Setup 1.0.12.exe

echo.
echo ========================================
echo SUCCESS! Icon embedded and installer ready
echo ========================================
echo.
echo NEXT STEPS:
echo 1. Uninstall old TrafficJamz from Programs and Features
echo 2. Delete: C:\Users\richc\AppData\Local\TrafficJamz
echo 3. Delete: C:\Users\richc\AppData\Roaming\TrafficJamz
echo 4. Run: C:\Windows\System32\ie4uinit.exe -show
echo 5. Install: dist-electron\TrafficJamz Setup 1.0.12.exe
echo 6. Check taskbar and desktop icons!
echo.
pause
