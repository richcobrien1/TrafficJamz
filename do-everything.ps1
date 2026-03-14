# Complete test and deploy script
$ErrorActionPreference = "Continue"

Set-Location "c:\Users\richc\Projects\TrafficJamz\jamz-client-vite"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "STEP 1: Running Playwright Tests" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$env:TEST_URL = "https://jamz.v2u.us"

Write-Host "Running quick test suite...`n" -ForegroundColor Yellow
node tests/quick-test.mjs

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "STEP 2: Committing and Pushing Changes" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Set-Location "c:\Users\richc\Projects\TrafficJamz"

Write-Host "Git status:" -ForegroundColor Yellow
git status --short

Write-Host "`nAdding all changes..." -ForegroundColor Yellow
git add .

Write-Host "`nCommitting..." -ForegroundColor Yellow
git commit -m "Fix: Windows-compatible test runner, Vercel build command, and test execution"

Write-Host "`nPushing to GitHub..." -ForegroundColor Yellow
git push origin main

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "Tests executed and changes pushed to GitHub." -ForegroundColor Green
Write-Host "Vercel will now redeploy with the correct build command." -ForegroundColor Green

pause
