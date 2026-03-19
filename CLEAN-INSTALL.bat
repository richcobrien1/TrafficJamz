@echo off
echo ========================================
echo CLEAN INSTALL - TrafficJamz 1.0.12
echo ========================================
echo.
echo STEP 1: Uninstall old version
echo Go to: Settings ^> Apps ^> TrafficJamz ^> Uninstall
echo.
pause
echo.

echo STEP 2: Clearing cached app data...
if exist "C:\Users\richc\AppData\Local\TrafficJamz" (
    rd /s /q "C:\Users\richc\AppData\Local\TrafficJamz"
    echo ✓ Cleared Local AppData
) else (
    echo - Local AppData already clear
)

if exist "C:\Users\richc\AppData\Roaming\TrafficJamz" (
    rd /s /q "C:\Users\richc\AppData\Roaming\TrafficJamz"
    echo ✓ Cleared Roaming AppData
) else (
    echo - Roaming AppData already clear
)

echo.
echo STEP 3: Refreshing Windows icon cache...
C:\Windows\System32\ie4uinit.exe -show
timeout /t 2 >nul
echo ✓ Icon cache refreshed
echo.

echo ========================================
echo READY TO INSTALL!
echo ========================================
echo.
echo Now installing TrafficJamz 1.0.12...
echo.

start "" "C:\Users\richc\Projects\TrafficJamz\jamz-client-vite\dist-electron\TrafficJamz Setup 1.0.12.exe"

echo.
echo After installation:
echo - Check desktop icon
echo - Launch app and check taskbar icon
echo - The TrafficJamz logo should show everywhere!
echo.
pause
