@echo off
echo ========================================
echo ICON VERIFICATION
echo ========================================
cd /d C:\Users\richc\Projects\TrafficJamz\jamz-client-vite

echo.
echo [1] Checking source icon file...
if exist "build\icon.ico" (
    dir "build\icon.ico" | find "icon.ico"
    echo.
    echo Icon file exists: 285 KB
) else (
    echo ERROR: Icon file missing!
    pause
    exit /b 1
)

echo.
echo [2] Extracting icon from unpacked exe...
node_modules\rcedit\bin\rcedit.exe "dist-electron\win-unpacked\TrafficJamz.exe" --get-icon "test-extracted.ico"

if exist "test-extracted.ico" (
    echo SUCCESS! Icon is embedded in exe
    dir "test-extracted.ico" | find "test-extracted.ico"
    del "test-extracted.ico"
) else (
    echo FAILED! Icon NOT in exe
)

echo.
echo [3] Checking installed exe location...
if exist "C:\Users\richc\AppData\Local\Programs\TrafficJamz\TrafficJamz.exe" (
    echo Installed exe found
    echo.
    echo Extracting icon from INSTALLED exe...
    node_modules\rcedit\bin\rcedit.exe "C:\Users\richc\AppData\Local\Programs\TrafficJamz\TrafficJamz.exe" --get-icon "installed-icon.ico"
    
    if exist "installed-icon.ico" (
        echo Icon IS in installed exe
        dir "installed-icon.ico" | find "installed-icon.ico"
        del "installed-icon.ico"
    ) else (
        echo Icon NOT in installed exe - INSTALLER PROBLEM!
    )
) else (
    echo Installed exe not found at expected location
)

echo.
echo [4] Checking icon file format...
powershell -Command "Get-Content 'build\icon.ico' -Encoding Byte -TotalCount 4 | ForEach-Object { '{0:X2}' -f $_ }"

echo.
pause
