# Simple direct test runner
$ErrorActionPreference = "Stop"

Set-Location "c:\Users\richc\Projects\TrafficJamz\jamz-client-vite"

Write-Host "`n=== TESTING TRAFFICJAMZ ===" -ForegroundColor Cyan
Write-Host "URL: https://trafficjamz.com`n" -ForegroundColor Yellow

$env:TEST_URL = "https://jamz.v2u.us"

Write-Host "Running tests on Chrome Desktop...`n" -ForegroundColor Green

npx playwright test tests/e2e/smoke.spec.js --project=chromium-desktop --reporter=list --timeout=30000

Write-Host "`n=== TESTS COMPLETE ===" -ForegroundColor Green
