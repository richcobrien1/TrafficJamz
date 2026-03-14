# Test runner with CORRECT production URL
$ErrorActionPreference = "Stop"

Set-Location "c:\Users\richc\Projects\TrafficJamz\jamz-client-vite"

Write-Host "`n=== TESTING TRAFFICJAMZ ===" -ForegroundColor Cyan
Write-Host "Production URL: https://jamz.v2u.us`n" -ForegroundColor Yellow

$env:TEST_URL = "https://jamz.v2u.us"

Write-Host "Running smoke tests on Chrome Desktop...`n" -ForegroundColor Green

npx playwright test tests/e2e/smoke.spec.js --project=chromium-desktop --reporter=list --timeout=30000

Write-Host "`n=== TESTS COMPLETE ===" -ForegroundColor Green
pause
