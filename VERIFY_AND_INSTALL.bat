@echo off
echo ========================================
echo TrafficJamz Verification and Install
echo ========================================
echo.

REM Step 1: Verify which version is installed
echo Step 1: Checking installed version timestamp...
echo.
if exist "%LOCALAPPDATA%\Programs\trafficjamz\TrafficJamz.exe" (
    dir "%LOCALAPPDATA%\Programs\trafficjamz\TrafficJamz.exe" | findstr "TrafficJamz"
    echo.
    echo ^^ If this shows a time BEFORE 11:36 AM, you have the OLD version!
) else (
    echo No installation found at %LOCALAPPDATA%\Programs\trafficjamz\
)
echo.

REM Step 2: Kill any running instances
echo Step 2: Killing any running TrafficJamz processes...
taskkill /F /IM "TrafficJamz.exe" 2>nul
if %ERRORLEVEL% EQU 0 (
    echo    - Killed TrafficJamz.exe
    timeout /t 3 >nul
) else (
    echo    - No running process found
)
echo.

REM Step 3: Show new build info
echo Step 3: New build information:
cd /d "%~dp0jamz-client-vite\dist-electron"
dir "TrafficJamz Setup 1.0.1.exe" | findstr "Setup"
echo.
echo ^^ This should show 11:36 AM or later!
echo.

REM Step 4: Prompt for uninstall
echo ========================================
echo IMPORTANT: You MUST uninstall first!
echo ========================================
echo.
echo 1. Press Win+I to open Settings
echo 2. Go to Apps ^> Installed apps
echo 3. Find "TrafficJamz" and click Uninstall
echo 4. Delete: %LOCALAPPDATA%\TrafficJamz
echo 5. Delete: %APPDATA%\TrafficJamz
echo.
echo Press any key AFTER you've uninstalled...
pause >nul

REM Step 5: Clean AppData
echo.
echo Cleaning AppData folders...
if exist "%LOCALAPPDATA%\TrafficJamz" (
    rmdir /S /Q "%LOCALAPPDATA%\TrafficJamz"
    echo    - Deleted %LOCALAPPDATA%\TrafficJamz
)
if exist "%APPDATA%\TrafficJamz" (
    rmdir /S /Q "%APPDATA%\TrafficJamz"
    echo    - Deleted %APPDATA%\TrafficJamz
)
if exist "%LOCALAPPDATA%\Programs\trafficjamz" (
    rmdir /S /Q "%LOCALAPPDATA%\Programs\trafficjamz"
    echo    - Deleted installation folder
)
echo.

REM Step 6: Launch installer
echo Launching new installer...
echo.
start "" "%~dp0jamz-client-vite\dist-electron\TrafficJamz Setup 1.0.1.exe"
echo.
echo ========================================
echo Installer launched!
echo ========================================
echo.
echo After installation:
echo 1. Launch TrafficJamz
echo 2. Press F12 to open DevTools
echo 3. Go to Network tab
echo 4. Check the Request URL - it should NOT be "file:///C:/"
echo.
pause
