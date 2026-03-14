@echo off
cd /d c:\Users\richc\Projects\TrafficJamz\jamz-client-vite
echo Running Playwright Tests...
set TEST_URL=https://trafficjamz.com
npx playwright test smoke.spec.js --project=chromium-desktop --reporter=html --reporter=list --timeout=30000 > test-output.log 2>&1
echo.
echo ============================================
echo Test Execution Complete
echo ============================================
type test-output.log
