@echo off
echo ========================================
echo STARTING APK HTTP SERVER
echo ========================================
echo.
echo Serving Android APK on port 8080...
echo.
echo Download URL: http://192.168.64.235:8080/app-debug.apk
echo.
echo Press Ctrl+C to stop the server
echo.

cd jamz-client-vite\android\app\build\outputs\apk\debug
python -m http.server 8080
