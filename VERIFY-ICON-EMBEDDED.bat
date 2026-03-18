@echo off
echo ========================================
echo VERIFY ICON IN EXE
echo ========================================
echo.

cd /d C:\Users\richc\Projects\TrafficJamz\jamz-client-vite

echo Checking unpacked TrafficJamz.exe for embedded icon...
echo.

:: Method 1: Check file properties with PowerShell
echo [Method 1] Checking Win32 properties...
powershell -Command "$exe = Get-Item 'dist-electron\win-unpacked\TrafficJamz.exe'; $exe | Select-Object Name, Length, VersionInfo | Format-List; if ($exe.VersionInfo.CompanyName -eq 'TrafficJamz') { Write-Host '✅ Version info embedded correctly!' -ForegroundColor Green } else { Write-Host '❌ Version info missing' -ForegroundColor Red }"

echo.
echo [Method 2] Icon resource check...
echo The exe should have icon resources embedded.
echo Right-click the exe and check if it shows the TrafficJamz icon.
echo.

echo File location:
echo %CD%\dist-electron\win-unpacked\TrafficJamz.exe
echo.

echo ========================================
echo NEXT STEP: Install and Test
echo ========================================
echo.
echo 1. Uninstall old TrafficJamz:
echo    Settings ^> Apps ^> TrafficJamz ^> Uninstall
echo.
echo 2. Install from:
echo    %CD%\dist-electron\TrafficJamz Setup 1.0.12.exe
echo.
echo 3. Check for icon:
echo    - Desktop shortcut should have TrafficJamz icon
echo    - Start menu shortcut should have TrafficJamz icon  
echo    - Launch app and check taskbar icon
echo.
pause
