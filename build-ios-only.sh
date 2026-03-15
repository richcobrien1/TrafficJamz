#!/bin/bash
# ============================================================================
# iOS Build Script (macOS/Linux only - requires Xcode)
# ============================================================================
# This script builds the iOS app for TrafficJamz
# Prerequisites: macOS with Xcode installed, CocoaPods installed
# Duration: ~3-5 minutes
# ============================================================================

set -e  # Exit on error

echo "========================================"
echo "TrafficJamz - iOS Build Script"
echo "========================================"
echo ""

# Step 1: Build Web App
echo "[1/4] Building web application..."
cd jamz-client-vite
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Web build failed!"
    exit 1
fi
echo "✅ Web build complete"
echo ""

# Step 2: Sync Capacitor to iOS
echo "[2/4] Syncing Capacitor to iOS..."
npx cap sync ios
if [ $? -ne 0 ]; then
    echo "❌ Capacitor sync failed!"
    exit 1
fi
echo "✅ Capacitor sync complete"
echo ""

# Step 3: Install CocoaPods dependencies
echo "[3/4] Installing iOS dependencies (CocoaPods)..."
cd ../mobile/iOS/App
pod install
if [ $? -ne 0 ]; then
    echo "⚠️  CocoaPods install failed - trying pod repo update..."
    pod repo update
    pod install
fi
cd ../../..
echo "✅ iOS dependencies installed"
echo ""

# Step 4: Build iOS App (requires Xcode)
echo "[4/4] Opening Xcode for iOS build..."
echo ""
echo "📱 Next Steps:"
echo "   1. Xcode will open with the iOS project"
echo "   2. Select your target device or simulator"
echo "   3. Click 'Product > Build' (⌘B) or 'Product > Run' (⌘R)"
echo "   4. For App Store: Product > Archive, then distribute"
echo ""
echo "Output locations:"
echo "   • Workspace: mobile/iOS/App/App.xcworkspace"
echo "   • Archive: ~/Library/Developer/Xcode/Archives/"
echo "   • IPA: Export from Xcode after archiving"
echo ""

# Open Xcode
open mobile/iOS/App/App.xcworkspace

echo "✅ iOS build script complete!"
echo "========================================"
