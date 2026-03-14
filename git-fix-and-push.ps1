# Fix git and commit everything
$ErrorActionPreference = "Continue"

Set-Location "c:\Users\richc\Projects\TrafficJamz"

Write-Host "`n=== Removing problematic 'nul' file ===" -ForegroundColor Yellow
if (Test-Path "jamz-client-vite\nul") {
    Remove-Item "jamz-client-vite\nul" -Force
    Write-Host "Removed nul file" -ForegroundColor Green
}

Write-Host "`n=== Adding changes ===" -ForegroundColor Yellow
git add .

Write-Host "`n=== Committing ===" -ForegroundColor Yellow
git commit -m "Fix: Windows-compatible test runner, Vercel build command, complete QA infrastructure"

Write-Host "`n=== Pushing to GitHub ===" -ForegroundColor Yellow
git push origin main

Write-Host "`n=== DONE ===" -ForegroundColor Green
Write-Host "Changes pushed. Vercel will redeploy with correct build command." -ForegroundColor Green
Write-Host "Check: https://vercel.com for deployment status" -ForegroundColor Cyan

pause
