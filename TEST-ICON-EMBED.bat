@echo off
echo ========================================
echo ICON EMBEDDING - CORRECT METHOD
echo ========================================
cd /d C:\Users\richc\Projects\TrafficJamz\jamz-client-vite

echo.
echo Comparing file sizes...
echo.
echo Source icon:
dir "build\icon.ico" | find "icon.ico"
echo.
echo Unpacked exe BEFORE icon embedding:
echo (Should be ~210 MB)

echo.
echo Now embedding icon with CORRECT syntax...
echo.
node_modules\rcedit\bin\rcedit.exe "dist-electron\win-unpacked\TrafficJamz.exe" --set-icon "build\icon.ico"

if %errorlevel% equ 0 (
    echo.
    echo ✓ Icon embedding command succeeded
    echo.
    echo Unpacked exe AFTER icon embedding:
    dir "dist-electron\win-unpacked\TrafficJamz.exe" | find "TrafficJamz.exe"
    echo (File size should have increased by ~285 KB)
) else (
    echo.
    echo ✗ Icon embedding FAILED
    pause
    exit /b 1
)

echo.
echo Now checking with PowerShell if icon resource exists...
powershell -Command "$exe = 'dist-electron\win-unpacked\TrafficJamz.exe'; if (Test-Path $exe) { try { [System.Reflection.Assembly]::LoadWithPartialName('System.Drawing') | Out-Null; $icon = [System.Drawing.Icon]::ExtractAssociatedIcon($exe); Write-Host 'Icon extracted successfully!'; Write-Host ('Icon size: {0}x{1}' -f $icon.Width, $icon.Height); } catch { Write-Host 'No icon found or extraction failed'; } } else { Write-Host 'Exe not found'; }"

echo.
pause
