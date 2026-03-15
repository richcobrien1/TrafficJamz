# TrafficJamz Rebuild Guide
**Date:** March 14, 2026  
**Target Devices:** Windows Desktop (Electron), Android Native (Motorola Razr), iOS (iPhone/iPad)

---

## 🚀 Quick Start - Build Everything

```batch
# Build ALL platforms (Electron + Android)
build-all-platforms.bat
```

**Duration:** ~5-10 minutes  
**Output:**
- ✅ Electron Windows App: `jamz-client-vite/dist-electron/`
- ✅ Android Debug APK: `mobile/Android/app/build/outputs/apk/debug/app-debug.apk`
- ✅ Android Release APK: `mobile/Android/app/build/outputs/apk/release/app-release-unsigned.apk`

---

## 📱 Android Only - Fast Build for Testing

```batch
# Build just the Android APK (faster)
build-android-only.bat
```

**Duration:** ~2-3 minutes  
**Output:** `app-debug.apk` ready for Motorola Razr

---

## 🍎 iOS Build (macOS Only)

```bash
# On macOS with Xcode installed
./build-ios-only.sh
```

**Duration:** ~3-5 minutes  
**Output:** Xcode workspace opens for building/archiving

**Windows Users:** iOS builds require macOS and Xcode. See [iOS Build Options](#ios-build-options-for-windows-users) below.

---

## 📲 Install APK to Motorola Razr

### Method 1: ADB (Recommended)

```batch
# Automatic installation via USB
install-android-apk.bat
```

**Prerequisites:**
1. Enable USB Debugging on Motorola Razr:
   - Settings → About Phone
   - Tap "Build Number" 7 times
   - Settings → System → Developer Options → USB Debugging (ON)
2. Connect phone via USB
3. Accept USB Debugging prompt on phone

### Method 2: Manual Install

1. Copy `app-debug.apk` to phone (USB, cloud, email)
2. On phone, open Downloads folder
3. Tap `app-debug.apk`
4. Allow "Install unknown apps" if prompted
5. Tap Install

---

## 🖥️ Electron Desktop Build

```batch
# Windows only
cd jamz-client-vite
npm run electron:build:win
```

**Output:** `jamz-client-vite/dist-electron/TrafficJamz Setup 1.0.0.exe`

**Cross-platform builds:**
```bash
# macOS (requires macOS to build)
npm run electron:build:mac

# Linux
npm run electron:build:linux

# All platforms
npm run electron:build
```

---

## 🍎 iOS Build Details (macOS Required)

### Prerequisites
- **macOS** (Catalina 10.15 or later)
- **Xcode 14+** (from App Store - free)
- **CocoaPods:** `sudo gem install cocoapods`
- **Apple Developer Account** ($99/year for App Store)

### Manual iOS Build Steps

```bash
# 1. Build web app
cd jamz-client-vite
npm run build

# 2. Sync Capacitor to iOS
npx cap sync ios

# 3. Install iOS dependencies
cd ../mobile/iOS/App
pod install

# 4. Open in Xcode
open App.xcworkspace
```

**In Xcode:**
1. Select target device or simulator (top toolbar)
2. **Product → Build** (⌘B) - Compile the app
3. **Product → Run** (⌘R) - Run on device/simulator
4. **Product → Archive** - Create distributable build for App Store

### iOS Output Locations

**Development Builds:**
- Location: `~/Library/Developer/Xcode/DerivedData/`
- Used for: Testing on simulator/connected devices

**App Store Archives:**
- Location: `~/Library/Developer/Xcode/Archives/`
- Format: `.xcarchive` files
- Distribution: Xcode Organizer → Select Archive → "Distribute App"
- Final Output: `.ipa` file for App Store or AdHoc distribution

### iOS Build Options for Windows Users

Since you're on Windows, here are your options:

#### Option 1: Use a Mac Computer (Recommended)
- Transfer project to a Mac
- Install Xcode from App Store
- Run `./build-ios-only.sh`

#### Option 2: Cloud Mac Rental
- **MacStadium** - Dedicated Mac servers
- **AWS EC2 Mac** - Cloud Mac instances
- **MacinCloud** - On-demand Mac access
- Cost: ~$25-100/month

#### Option 3: CI/CD with macOS Runners
- **GitHub Actions** - Free for public repos, includes macOS runners
- **CircleCI** - macOS build support
- **Bitrise** - Mobile-focused CI/CD
- **Codemagic** - Free tier available

#### Option 4: Cloud Build Services
- **Expo EAS Build** - No Mac needed
- **Ionic Appflow** - Full CI/CD for Capacitor
- **App Center** (Microsoft) - Mobile DevOps

#### Option 5: Live Reload Testing (No Build Needed)
```bash
# On Windows - start dev server
cd jamz-client-vite
npm run dev

# On Mac/iPhone - connect to Windows dev server
npx cap run ios --livereload --external
```
This lets you test on iOS devices without building!

---

## 📊 Build Commands Reference

### Manual Build Steps (Step-by-step)

#### Android APK - Manual Process

```batch
# 1. Build web app
cd jamz-client-vite
npm run build

# 2. Sync with Capacitor
npx cap sync android

# 3. Build APK
cd ..\mobile\Android
gradlew assembleDebug

# 4. Find APK
# app\build\outputs\apk\debug\app-debug.apk
```

#### Electron - Manual Process

```batch
# 1. Build for Electron
cd jamz-client-vite
npm run build:electron

# 2. Package with Electron Builder
npx electron-builder --win
```

---

## 🔧 Troubleshooting

### Android Build Fails

**Error:** `gradlew not found`
```batch
cd mobile\Android
# Windows automatically tries gradlew.bat
.\gradlew.bat assembleDebug
```

**Error:** `ANDROID_HOME not set`
1. Install Android Studio
2. Set environment variable:
   ```
   ANDROID_HOME=C:\Users\YourName\AppData\Local\Android\Sdk
   ```
3. Restart terminal

**Error:** `Build failed with Gradle`
- Open Android Studio
- File → Open → `mobile/Android`
- Let it sync Gradle
- Build → Rebuild Project

### Electron Build Fails

**Error:** `electron-builder not found`
```batch
cd jamz-client-vite
npm install electron-builder --save-dev
```

**Error:** `Code signing failed`
- For testing, unsigned builds are fine
- For distribution, you need a code signing certificate

### iOS Build Fails (macOS)

**Error:** `pod install` fails
```bash
# Update CocoaPods repo
pod repo update

# Try install again
cd mobile/iOS/App
pod install
```

**Error:** `Command not found: pod`
```bash
# Install CocoaPods
sudo gem install cocoapods

# If gem fails, try Homebrew
brew install cocoapods
```

**Error:** `No provisioning profile found`
1. Open Xcode
2. Select project in left sidebar
3. Select target "App"
4. Go to "Signing & Capabilities" tab
5. Select your Team from dropdown
6. Xcode will auto-generate provisioning profile

**Error:** `Xcode license not accepted`
```bash
sudo xcodebuild -license accept
```

**Error:** `Module compiled with Swift X.X cannot be imported by Swift Y.Y`
- Clean build folder: In Xcode, **Product → Clean Build Folder** (⇧⌘K)
- Delete derived data: `rm -rf ~/Library/Developer/Xcode/DerivedData`
- Rebuild: **Product → Build** (⌘B)

**Error:** Build fails with CocoaPods errors
```bash
cd mobile/iOS/App
pod deintegrate
pod cache clean --all
pod install
```

### APK Installation Fails

**Error:** `device not found`
```batch
# Check if device is connected
adb devices

# If blank, check USB connection and USB Debugging
```

**Error:** `INSTALL_FAILED_UPDATE_INCOMPATIBLE`
```batch
# Uninstall old version first
adb uninstall com.trafficjamz.app

# Then reinstall
adb install -r app-debug.apk
```

---

## 📝 Build Outputs

### Android APK Variants

| Variant | File | Size | Use Case |
|---------|------|------|----------|
| Debug | `app-debug.apk` | ~8-12 MB | Development, testing |
| Release (unsigned) | `app-release-unsigned.apk` | ~6-8 MB | Pre-production |
| Release (signed) | `app-release.apk` | ~6-8 MB | Production (Play Store) |

### Electron Artifacts

| Platform | File | Size |
|----------|------|------|
| Windows | `TrafficJamz Setup 1.0.0.exe` | ~80-120 MB |
| Windows Portable | `TrafficJamz 1.0.0.exe` | ~80-120 MB |
| macOS | `TrafficJamz-1.0.0.dmg` | ~90-130 MB |
| Linux | `TrafficJamz-1.0.0.AppImage` | ~90-130 MB |

---

## 🎯 Testing Checklist - Motorola Razr

### Pre-Installation
- [ ] Phone has USB Debugging enabled
- [ ] Phone connected via USB (file transfer mode)
- [ ] ADB recognizes device (`adb devices`)
- [ ] Latest APK built successfully

### Installation
- [ ] Old version uninstalled (if upgrading)
- [ ] APK installs without errors
- [ ] App icon appears in launcher
- [ ] App launches without crash

### Basic Functionality
- [ ] Login screen loads
- [ ] Can authenticate
- [ ] Dashboard displays
- [ ] Location permission requested
- [ ] Microphone permission requested
- [ ] Camera features work (if used)

### Performance
- [ ] App launch time < 3 seconds
- [ ] UI smooth (60fps scrolling)
- [ ] No excessive battery drain
- [ ] Works on WiFi
- [ ] Works on cellular data

See [ANDROID_TESTING_CHECKLIST.md](ANDROID_TESTING_CHECKLIST.md) for comprehensive testing guide.

---

## 🍎 Testing Checklist - iOS (iPhone/iPad)

### Pre-Installation (Development Build)
- [ ] Mac with Xcode installed
- [ ] iOS device connected via USB
- [ ] Device trusted on Mac ("Trust this computer")
- [ ] Correct provisioning profile selected in Xcode
- [ ] Build succeeds without errors

### Installation Methods

**Method 1: Xcode Direct Install (Development)**
1. Connect device via USB
2. Select device as build target in Xcode
3. Click Run (⌘R)
4. App installs and launches automatically

**Method 2: TestFlight (Beta Testing)**
1. Archive app in Xcode (Product → Archive)
2. Distribute to App Store Connect
3. Add testers in App Store Connect
4. Testers download via TestFlight app

**Method 3: AdHoc Distribution (Internal)**
1. Create AdHoc provisioning profile
2. Archive app with AdHoc profile
3. Export .ipa file
4. Install via Xcode Devices window

### Basic Functionality Tests
- [ ] App launches without crash
- [ ] No black/white screen on launch
- [ ] Authentication with Clerk works
- [ ] Dashboard displays correctly
- [ ] Navigation bar/tab bar works
- [ ] All pages load properly

### Permissions (iOS-specific)
- [ ] Location permission alert appears
- [ ] Location "Always" option available (background tracking)
- [ ] Microphone permission requested
- [ ] Notifications permission (if enabled)
- [ ] Photo library access (if needed)

### Core Features
- [ ] GPS location displays on map
- [ ] Map renders correctly (Apple Maps/Mapbox)
- [ ] Real-time location updates work
- [ ] Audio session starts/stops
- [ ] Microphone captures audio
- [ ] Music playback works (Spotify/Apple Music)
- [ ] Group features functional

### iOS-Specific Tests
- [ ] App survives background/foreground transitions
- [ ] Background location tracking works
- [ ] Push notifications received (if enabled)
- [ ] Works in portrait mode
- [ ] Works in landscape mode (if supported)
- [ ] Safe area insets respected (notch/island)
- [ ] Dark mode supported (if implemented)
- [ ] Keyboard shows/hides properly
- [ ] No memory warnings in Xcode console

### Performance (iOS)
- [ ] App launch time < 2 seconds
- [ ] Smooth 60fps scrolling
- [ ] No CPU spikes in Activity Monitor
- [ ] Memory usage reasonable (<200MB idle)
- [ ] Works on WiFi
- [ ] Works on cellular data
- [ ] Battery drain acceptable

### Device-Specific
- [ ] Tested on iPhone (6.1" and smaller screens)
- [ ] Tested on iPhone Pro/Max (larger screens)
- [ ] Tested on iPad (if supporting tablets)
- [ ] Dynamic Island doesn't obscure content (iPhone 14 Pro+)
- [ ] Notch doesn't obscure content (iPhone X+)

### Build Variants
- [ ] Debug build installs and runs
- [ ] Release build installs and runs
- [ ] App Store build passes validation

---

## 🔄 CI/CD Build Process (Future)

### GitHub Actions (Planned)

```yaml
# .github/workflows/build-android.yml
name: Build Android APK
on: [push, workflow_dispatch]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - uses: actions/setup-java@v3
      - run: cd jamz-client-vite && npm install
      - run: cd jamz-client-vite && npm run build
      - run: cd jamz-client-vite && npx cap sync android
      - run: cd mobile/Android && ./gradlew assembleDebug
      - uses: actions/upload-artifact@v3
        with:
          name: app-debug
          path: mobile/Android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 📚 Related Documentation

- [ANDROID_TESTING_CHECKLIST.md](ANDROID_TESTING_CHECKLIST.md) - Full Android test plan
- [BUILD_ANDROID.md](docs/BUILD_ANDROID.md) - Detailed Android build docs
- [BUILD_EXPORT_SUMMARY_MARCH_11_2026.md](BUILD_EXPORT_SUMMARY_MARCH_11_2026.md) - Previous build report
- [MOBILE_TESTING_GUIDE.md](MOBILE_TESTING_GUIDE.md) - Mobile responsive testing

---

**Last Updated:** March 14, 2026  
**Tested On:** Windows 11, Motorola Razr (Android 14)
