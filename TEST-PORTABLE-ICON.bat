@echo off
echo ========================================
echo ICON VERIFICATION AND PORTABLE APP
echo ========================================
cd /d C:\Users\richc\Projects\TrafficJamz\jamz-client-vite

echo.
echo [1] Checking if icon is loaded by Windows...
powershell -Command "$exe = 'dist-electron\win-unpacked\TrafficJamz.exe'; try { [System.Reflection.Assembly]::LoadWithPartialName('System.Drawing') | Out-Null; $icon = [System.Drawing.Icon]::ExtractAssociatedIcon($exe); if ($icon) { Write-Host '✓ ICON FOUND IN EXE!'; Write-Host ('  Size: {0}x{1}' -f $icon.Width, $icon.Height); } else { Write-Host '✗ No icon found'; } } catch { Write-Host '✗ Error extracting icon:', $_.Exception.Message; }"

echo.
echo [2] Creating portable launch script...
(
echo @echo off
echo start "" "%%~dp0TrafficJamz.exe"
) > "dist-electron\win-unpacked\Launch TrafficJamz.bat"

echo ✓ Portable app ready!
echo.
echo ========================================
echo TEST THE ICON NOW!
echo ========================================
echo.
echo Location: dist-electron\win-unpacked\
echo.
echo Right-click TrafficJamz.exe and check the icon
echo OR double-click "Launch TrafficJamz.bat" to run it
echo.
pause

explorer dist-electron\win-unpacked
