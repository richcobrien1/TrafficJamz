@echo off
cd /d c:\Users\richc\Projects\TrafficJamz

echo Removing problematic nul file...
del /f /q jamz-client-vite\nul 2>nul

echo.
echo Adding all changes...
git add .

echo.
echo Committing...
git commit -m "Fix: Correct production URL (jamz.v2u.us), Windows test runner, Vercel build"

echo.
echo Pushing to GitHub...
git push origin main

echo.
echo ====================================
echo DONE! Vercel is now deploying.
echo Tests will now run against: https://jamz.v2u.us
echo ====================================
pause
