@echo off
echo Deploying frontend hotfix to container...
docker cp jamz-client-vite\dist\. jamz-frontend-1:/usr/share/nginx/html/
if %ERRORLEVEL% EQU 0 (
    echo ✅ Frontend deployed successfully!
) else (
    echo ❌ Deployment failed
    exit /b 1
)
