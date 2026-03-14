@echo off
cd c:\Users\richc\Projects\TrafficJamz\jamz-client-vite
echo Installing Playwright...
call npm install @playwright/test
echo.
echo Installing browser binaries...
call npx playwright install
echo.
echo Done!
pause
