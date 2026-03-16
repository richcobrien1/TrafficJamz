@echo off
echo ========================================
echo TRAFFICJAMZ NUCLEAR UNINSTALL
echo This will remove ALL traces of TrafficJamz
echo ========================================
echo.

:: Close any running instances
echo Killing all TrafficJamz processes...
taskkill /F /IM trafficjamz.exe 2>nul
timeout /t 2 /nobreak >nul

:: Uninstall via Windows Apps
echo.
echo Uninstalling from Windows Apps...
wmic product where "name like '%%TrafficJamz%%'" call uninstall /nointeractive 2>nul

:: Alternative PowerShell uninstall
powershell -Command "Get-Package -Name '*TrafficJamz*' -ErrorAction SilentlyContinue | Uninstall-Package -Force" 2>nul

:: Run the official uninstaller if it exists
if exist "%LOCALAPPDATA%\Programs\trafficjamz\Uninstall TrafficJamz.exe" (
    echo Running official uninstaller...
    "%LOCALAPPDATA%\Programs\trafficjamz\Uninstall TrafficJamz.exe" /S
    timeout /t 3 /nobreak >nul
)

:: Delete installation directories
echo.
echo Deleting installation directories...
rd /s /q "%LOCALAPPDATA%\Programs\trafficjamz" 2>nul
rd /s /q "%PROGRAMFILES%\TrafficJamz" 2>nul
rd /s /q "%PROGRAMFILES(X86)%\TrafficJamz" 2>nul

:: Delete AppData
echo Deleting AppData...
rd /s /q "%APPDATA%\trafficjamz" 2>nul
rd /s /q "%LOCALAPPDATA%\trafficjamz" 2>nul
rd /s /q "%LOCALAPPDATA%\trafficjamz-updater" 2>nul

:: Delete temp files
echo Deleting temp files...
del /f /q "%TEMP%\trafficjamz*" 2>nul
rd /s /q "%TEMP%\trafficjamz" 2>nul

:: Clear Windows icon cache
echo Clearing icon cache...
taskkill /F /IM explorer.exe 2>nul
timeout /t 1 /nobreak >nul
del /a /q "%LOCALAPPDATA%\IconCache.db" 2>nul
del /a /f /q "%LOCALAPPDATA%\Microsoft\Windows\Explorer\iconcache*" 2>nul
start explorer.exe

:: Delete desktop shortcuts
echo Deleting shortcuts...
del /f /q "%USERPROFILE%\Desktop\TrafficJamz.lnk" 2>nul
del /f /q "%APPDATA%\Microsoft\Windows\Start Menu\Programs\TrafficJamz.lnk" 2>nul
rd /s /q "%APPDATA%\Microsoft\Windows\Start Menu\Programs\TrafficJamz" 2>nul

:: Clean registry (careful!)
echo Cleaning registry...
reg delete "HKCU\Software\TrafficJamz" /f 2>nul
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\trafficjamz" /f 2>nul
reg delete "HKLM\Software\TrafficJamz" /f 2>nul
reg delete "HKLM\Software\WOW6432Node\TrafficJamz" /f 2>nul

echo.
echo ========================================
echo UNINSTALL COMPLETE
echo ========================================
echo.
echo Now do a FRESH INSTALL:
echo 1. Go to: jamz-client-vite\dist-electron
echo 2. Find the LATEST installer (check timestamp)
echo 3. Right-click installer ^> Run as Administrator
echo.
echo The latest build is from TODAY at 11:36 AM
echo It should be around 95 MB
echo.
pause
