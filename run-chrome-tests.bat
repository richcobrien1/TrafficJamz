@echo off
cd /d c:\Users\richc\Projects\TrafficJamz\jamz-client-vite
echo Running Chrome Desktop Smoke Tests...
npx playwright test smoke.spec.js --project=chromium-desktop --reporter=list --timeout=30000 > test-output-chrome.txt 2>&1
echo.
echo Test run complete. Results:
type test-output-chrome.txt
