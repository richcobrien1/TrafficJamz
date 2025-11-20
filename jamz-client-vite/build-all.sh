#!/bin/bash
# TrafficJamz Multi-Platform Build Script
# Builds web, mobile (Android/iOS), and desktop (Windows/Mac/Linux) distributions

set -e  # Exit on error

echo "🚀 TrafficJamz Multi-Platform Build Script"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored status
print_status() {
    echo -e "${BLUE}▶ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Parse command line arguments
BUILD_WEB=false
BUILD_ANDROID=false
BUILD_IOS=false
BUILD_ELECTRON_WIN=false
BUILD_ELECTRON_MAC=false
BUILD_ELECTRON_LINUX=false
BUILD_ALL=false

if [ $# -eq 0 ]; then
    BUILD_ALL=true
else
    for arg in "$@"; do
        case $arg in
            --web)
                BUILD_WEB=true
                ;;
            --android)
                BUILD_ANDROID=true
                ;;
            --ios)
                BUILD_IOS=true
                ;;
            --electron-win)
                BUILD_ELECTRON_WIN=true
                ;;
            --electron-mac)
                BUILD_ELECTRON_MAC=true
                ;;
            --electron-linux)
                BUILD_ELECTRON_LINUX=true
                ;;
            --electron)
                BUILD_ELECTRON_WIN=true
                BUILD_ELECTRON_MAC=true
                BUILD_ELECTRON_LINUX=true
                ;;
            --mobile)
                BUILD_ANDROID=true
                BUILD_IOS=true
                ;;
            --all)
                BUILD_ALL=true
                ;;
            *)
                echo "Unknown option: $arg"
                echo "Usage: ./build-all.sh [--web] [--android] [--ios] [--electron-win] [--electron-mac] [--electron-linux] [--electron] [--mobile] [--all]"
                exit 1
                ;;
        esac
    done
fi

if [ "$BUILD_ALL" = true ]; then
    BUILD_WEB=true
    BUILD_ANDROID=true
    BUILD_IOS=true
    BUILD_ELECTRON_WIN=true
    BUILD_ELECTRON_MAC=true
    BUILD_ELECTRON_LINUX=true
fi

echo "Build targets:"
[ "$BUILD_WEB" = true ] && echo "  ✓ Web (Vite)"
[ "$BUILD_ANDROID" = true ] && echo "  ✓ Android (Capacitor)"
[ "$BUILD_IOS" = true ] && echo "  ✓ iOS (Capacitor)"
[ "$BUILD_ELECTRON_WIN" = true ] && echo "  ✓ Electron Windows"
[ "$BUILD_ELECTRON_MAC" = true ] && echo "  ✓ Electron macOS"
[ "$BUILD_ELECTRON_LINUX" = true ] && echo "  ✓ Electron Linux"
echo ""

# Clean previous builds
print_status "Cleaning previous builds..."
rm -rf dist dist-electron 2>/dev/null || true
print_success "Clean complete"
echo ""

# 1. WEB BUILD
if [ "$BUILD_WEB" = true ]; then
    print_status "Building Web Application (Vite)..."
    npm run build
    print_success "Web build complete → dist/"
    echo ""
fi

# 2. ANDROID BUILD
if [ "$BUILD_ANDROID" = true ]; then
    print_status "Building Android Application (Capacitor)..."
    
    # Check if Android Studio is available
    if command -v adb &> /dev/null; then
        npm run cap:sync:android
        print_success "Android sync complete"
        print_warning "Open Android Studio to build APK/Bundle:"
        echo "  npm run cap:open:android"
    else
        print_error "Android SDK not found. Install Android Studio first."
        print_warning "Skipping Android build..."
    fi
    echo ""
fi

# 3. iOS BUILD
if [ "$BUILD_IOS" = true ]; then
    print_status "Building iOS Application (Capacitor)..."
    
    # Check if on macOS with Xcode
    if [[ "$OSTYPE" == "darwin"* ]]; then
        if command -v xcodebuild &> /dev/null; then
            npm run cap:sync:ios
            print_success "iOS sync complete"
            print_warning "Open Xcode to build IPA:"
            echo "  npm run cap:open:ios"
        else
            print_error "Xcode not found. Install Xcode from App Store first."
            print_warning "Skipping iOS build..."
        fi
    else
        print_warning "iOS builds require macOS. Skipping..."
    fi
    echo ""
fi

# 4. ELECTRON WINDOWS BUILD
if [ "$BUILD_ELECTRON_WIN" = true ]; then
    print_status "Building Electron Windows Installer..."
    npm run electron:build:win
    print_success "Windows build complete → dist-electron/"
    echo "  • TrafficJamz-Setup-1.0.0.exe (Installer)"
    echo "  • TrafficJamz-1.0.0-portable.exe (Portable)"
    echo ""
fi

# 5. ELECTRON MAC BUILD
if [ "$BUILD_ELECTRON_MAC" = true ]; then
    print_status "Building Electron macOS Installer..."
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        npm run electron:build:mac
        print_success "macOS build complete → dist-electron/"
        echo "  • TrafficJamz-1.0.0.dmg (Installer)"
        echo "  • TrafficJamz-1.0.0-mac.zip (Archive)"
    else
        print_warning "macOS builds should be done on macOS. Attempting anyway..."
        npm run electron:build:mac || print_error "macOS build failed (expected on non-Mac)"
    fi
    echo ""
fi

# 6. ELECTRON LINUX BUILD
if [ "$BUILD_ELECTRON_LINUX" = true ]; then
    print_status "Building Electron Linux Packages..."
    npm run electron:build:linux
    print_success "Linux build complete → dist-electron/"
    echo "  • TrafficJamz-1.0.0.AppImage"
    echo "  • trafficjamz_1.0.0_amd64.deb"
    echo ""
fi

# Summary
echo "=========================================="
echo -e "${GREEN}✓ Build Complete!${NC}"
echo ""
echo "Build artifacts:"
[ "$BUILD_WEB" = true ] && echo "  📦 Web: dist/"
[ "$BUILD_ANDROID" = true ] && echo "  📱 Android: android/app/build/outputs/"
[ "$BUILD_IOS" = true ] && echo "  📱 iOS: ios/App/"
if [ "$BUILD_ELECTRON_WIN" = true ] || [ "$BUILD_ELECTRON_MAC" = true ] || [ "$BUILD_ELECTRON_LINUX" = true ]; then
    echo "  🖥️  Desktop: dist-electron/"
fi
echo ""
echo "Next steps:"
echo "  • Test builds locally"
echo "  • Deploy web build to Vercel"
echo "  • Upload installers to GitHub Releases"
echo "  • Distribute mobile apps via App Store/Play Store"
echo ""
