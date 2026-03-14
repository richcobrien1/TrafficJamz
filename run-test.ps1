# PowerShell test runner
Set-Location "c:\Users\richc\Projects\TrafficJamz\jamz-client-vite"

Write-Host "=== Playwright Version Check ==="
npx playwright --version

Write-Host "`n=== Listing Tests ==="
npx playwright test --list 2>&1

Write-Host "`n=== Running Smoke Tests on Chromium ==="
$env:TEST_URL = "https://trafficjamz.com"
npx playwright test smoke.spec.js --project=chromium-desktop --reporter=list --timeout=30000 2>&1

Write-Host "`n=== Test run complete ==="
