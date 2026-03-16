@echo off
echo ========================================
echo TrafficJamz Complete Uninstall Script
echo ========================================
echo.

REM Step 1: Kill any running processes
echo Step 1: Killing TrafficJamz processes...
taskkill /F /IM "TrafficJamz.exe" 2>nul
if %ERRORLEVEL% EQU 0 (
    echo    - TrafficJamz.exe killed
) else (
    echo    - No TrafficJamz.exe process found
)

timeout /t 2 >nul

REM Step 2: Uninstall via Windows
echo.
echo Step 2: Please uninstall TrafficJamz from Windows Settings
echo    1. Open Settings (Win + I)
echo    2. Go to Apps ^> Installed apps
echo    3. Find "TrafficJamz" and click Uninstall
echo.
echo Press any key after uninstalling from Windows Settings...
pause >nul

REM Step 3: Delete AppData folders
echo.
echo Step 3: Deleting AppData folders...
if exist "%LOCALAPPDATA%\TrafficJamz" (
    rmdir /S /Q "%LOCALAPPDATA%\TrafficJamz"
    echo    - Deleted %LOCALAPPDATA%\TrafficJamz
) else (
    echo    - %LOCALAPPDATA%\TrafficJamz not found
)

if exist "%LOCALAPPDATA%\trafficjamz" (
    rmdir /S /Q "%LOCALAPPDATA%\trafficjamz"
    echo    - Deleted %LOCALAPPDATA%\trafficjamz
)

if exist "%APPDATA%\TrafficJamz" (
    rmdir /S /Q "%APPDATA%\TrafficJamz"
    echo    - Deleted %APPDATA%\TrafficJamz
) else (
    echo    - %APPDATA%\TrafficJamz not found
)

if exist "%APPDATA%\trafficjamz" (
    rmdir /S /Q "%APPDATA%\trafficjamz"
    echo    - Deleted %APPDATA%\trafficjamz
)

REM Step 4: Delete installation folder
echo.
echo Step 4: Deleting installation folder...
if exist "%LOCALAPPDATA%\Programs\trafficjamz" (
    rmdir /S /Q "%LOCALAPPDATA%\Programs\trafficjamz"
    echo    - Deleted %LOCALAPPDATA%\Programs\trafficjamz
) else (
    echo    - Installation folder not found
)

if exist "%ProgramFiles%\TrafficJamz" (
    rmdir /S /Q "%ProgramFiles%\TrafficJamz"
    echo    - Deleted %ProgramFiles%\TrafficJamz
)

REM Step 5: Clear icon cache
echo.
echo Step 5: Clearing Windows icon cache...
taskkill /F /IM explorer.exe >nul 2>&1
timeout /t 2 >nul

if exist "%LOCALAPPDATA%\IconCache.db" (
    del /F /Q "%LOCALAPPDATA%\IconCache.db" 2>nul
    echo    - Icon cache cleared
)

if exist "%LOCALAPPDATA%\Microsoft\Windows\Explorer\iconcache*.db" (
    del /F /Q "%LOCALAPPDATA%\Microsoft\Windows\Explorer\iconcache*.db" 2>nul
)

start explorer.exe
timeout /t 2 >nul

REM Step 6: Clean registry (optional - be careful!)
echo.
echo Step 6: Registry cleanup...
echo    Skipping automatic registry cleanup (requires admin rights)
echo    If needed, manually remove:
echo      HKEY_CURRENT_USER\Software\trafficjamz
echo      HKEY_LOCAL_MACHINE\SOFTWARE\trafficjamz

echo.
echo ========================================
echo Uninstall Complete!
echo ========================================
echo.
echo You can now install the new version from:
echo jamz-client-vite\dist-electron\TrafficJamz Setup 1.0.1.exe
echo.
pause
