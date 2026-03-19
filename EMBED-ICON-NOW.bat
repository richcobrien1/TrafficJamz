@echo off
echo ========================================
echo MANUAL ICON EMBEDDING
echo ========================================
cd /d C:\Users\richc\Projects\TrafficJamz\jamz-client-vite

echo.
echo Embedding icon into TrafficJamz.exe...
node_modules\rcedit\bin\rcedit.exe "dist-electron\win-unpacked\TrafficJamz.exe" --set-icon "build\icon.ico" --set-version-string "CompanyName" "TrafficJamz" --set-version-string "FileDescription" "TrafficJamz" --set-version-string "ProductName" "TrafficJamz"

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo SUCCESS! Icon embedded!
    echo ========================================
    echo.
    echo Now rebuild the installer:
    echo.
    pause
    
    echo Running build-electron-win.cjs to repackage...
    node scripts\build-electron-win.cjs
    
    if %errorlevel% equ 0 (
        echo.
        echo ========================================
        echo COMPLETE! 
        echo ========================================
        echo.
        echo Install: dist-electron\TrafficJamz Setup 1.0.12.exe
        echo.
        explorer dist-electron
    ) else (
        echo ERROR: Repackaging failed!
    )
) else (
    echo ERROR: Icon embedding failed!
    pause
)

pause
