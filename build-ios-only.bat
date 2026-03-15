@echo off
REM ============================================================================
REM iOS Build Information (Windows)
REM ============================================================================
REM iOS apps require macOS with Xcode installed
REM This script provides instructions for building on macOS
REM ============================================================================

echo ========================================
echo TrafficJamz - iOS Build (macOS Required)
echo ========================================
echo.

echo ❌ iOS builds require macOS with Xcode installed
echo.
echo You have two options:
echo.
echo OPTION 1: Use a Mac
echo   1. Transfer this project to a Mac computer
echo   2. Install Xcode from the App Store (free)
echo   3. Install CocoaPods: sudo gem install cocoapods
echo   4. Run: ./build-ios-only.sh
echo.
echo OPTION 2: Use macOS Virtual Machine or Cloud Build
echo   • Rent a Mac in the cloud (MacStadium, AWS EC2 Mac)
echo   • Use CI/CD services (GitHub Actions, CircleCI)
echo   • Use Expo EAS Build or similar cloud build services
echo.
echo MANUAL BUILD STEPS (on macOS):
echo   1. cd jamz-client-vite
echo   2. npm run build
echo   3. npx cap sync ios
echo   4. cd ../mobile/iOS/App
echo   5. pod install
echo   6. open App.xcworkspace
echo   7. In Xcode: Product ^> Build or Product ^> Run
echo.
echo ALTERNATIVE: Use Capacitor Live Reload for testing
echo   On Mac:
echo   1. npm run dev (on this Windows machine)
echo   2. npx cap run ios --livereload --external
echo   3. Test on iOS simulator/device connecting to your dev server
echo.
echo ========================================

pause
