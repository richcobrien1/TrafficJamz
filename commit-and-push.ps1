# PowerShell script to commit and push fixes
Set-Location "c:\Users\richc\Projects\TrafficJamz"

Write-Host "=== Git Status ===" -ForegroundColor Cyan
git status

Write-Host "`n=== Adding all changes ===" -ForegroundColor Cyan
git add .

Write-Host "`n=== Committing changes ===" -ForegroundColor Cyan
git commit -m "Fix: Windows-compatible test runner and ensure vercel.json buildCommand is correct"

Write-Host "`n=== Pushing to GitHub ===" -ForegroundColor Cyan
git push origin main

Write-Host "`n=== Done! ===" -ForegroundColor Green
Write-Host "Vercel should now redeploy automatically with the correct build command."
