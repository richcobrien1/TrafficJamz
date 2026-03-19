# TrafficJamz - Production Deployment Testing Plan
**Date:** March 17, 2026  
**Target Platforms:** Google Play | Microsoft Store | Apple App Store | Mac App Store  
**Version:** 1.0.9

---

## 🎯 Deployment Goals

### Android (Google Play Store)
- [ ] Build signed release APK/AAB
- [ ] Test on physical device (Motorola Razr)
- [ ] Verify all core features work
- [ ] Submit to Google Play Console

### Windows (Microsoft Store)
- [ ] Package MSIX for Microsoft Store
- [ ] Test installer on clean Windows machine
- [ ] Verify all core features work
- [ ] Submit to Microsoft Partner Center

### iOS (Apple App Store)
- [ ] Build IPA (requires MacBook Pro + Apple Developer Account)
- [ ] Test on physical iPhone device
- [ ] Submit to App Store Connect via TestFlight

### macOS (Mac App Store)
- [ ] Build DMG/PKG (requires MacBook Pro)
- [ ] Test on macOS device
- [ ] Submit to App Store Connect

---

## 📋 Testing Checklist (All Platforms)

### 1. Authentication (Login/Signup) ✅ High Priority
- [ ] Email + Password signup
- [ ] Email + Password login
- [ ] Google OAuth signup
- [ ] Google OAuth login
- [ ] MFA/2FA verification
- [ ] Session persistence after app restart
- [ ] Logout functionality
- [ ] Token refresh on expiry
- [ ] Error handling (wrong password, network errors)

### 2. Navigation ✅ High Priority
- [ ] Dashboard loads after login
- [ ] Navigate to Groups page
- [ ] Navigate to specific group detail
- [ ] Back button works correctly
- [ ] Deep linking (trafficjamz:// URLs)
- [ ] Browser/native session sync

### 3. Groups Management ✅ Medium Priority
- [ ] View groups list
- [ ] Create new group
- [ ] Join existing group
- [ ] View group members
- [ ] Leave group
- [ ] Delete group (owner only)
- [ ] Real-time member updates

### 4. Music Playback ✅ High Priority
- [ ] Connect Spotify account
- [ ] Connect Apple Music account
- [ ] Connect YouTube Music account
- [ ] Play/Pause synchronization across devices
- [ ] Track change synchronization
- [ ] Volume control
- [ ] Queue management
- [ ] DJ mode (take/release control)
- [ ] Music controls on all pages (Location, Voice, Music)

### 5. Voice Chat ✅ High Priority
- [ ] Join voice channel
- [ ] Mute/Unmute microphone
- [ ] Push-to-talk functionality
- [ ] Voice quality check
- [ ] Multiple users in channel
- [ ] Leave voice channel
- [ ] Audio input device selection
- [ ] Audio output device selection

### 6. Location Tracking ✅ Medium Priority
- [ ] GPS permission request
- [ ] Location sharing enabled
- [ ] View own location on map
- [ ] View group members' locations on map
- [ ] Real-time location updates
- [ ] Location accuracy
- [ ] Battery impact testing

### 7. Installer/App Package ✅ Critical
- [ ] App installs successfully
- [ ] App launches on first run
- [ ] Desktop/app drawer shortcut created
- [ ] App icon displays correctly
- [ ] Uninstaller works properly
- [ ] App updates work (version migration)

---

## 🔧 Platform-Specific Tests

### Windows Electron (v1.0.9)
**Installer:** `TrafficJamz Setup 1.0.9.exe` (95 MB)

**Pre-Test Setup:**
```bash
cd jamz-client-vite
# Latest installer is already built at dist-electron/TrafficJamz Setup 1.0.9.exe
```

**Manual Testing:**
1. [ ] Install on clean Windows 10/11 machine
2. [ ] Verify desktop icon displays TrafficJamz logo
3. [ ] Launch app from Start Menu
4. [ ] Launch app from Desktop shortcut
5. [ ] Test deep linking: `trafficjamz://` from browser
6. [ ] Test all features (login, music, voice, location)
7. [ ] Close app and verify it closes properly
8. [ ] Relaunch and verify session persists
9. [ ] Uninstall and verify clean removal

**Microsoft Store Packaging:**
```bash
# Need to create MSIX package for Microsoft Store
# TODO: Install Windows SDK and use MakeAppx tool
```

---

### Android (Google Play)
**Current:** `app-debug.apk` (9 MB) - Debug version
**Needed:** Signed release APK/AAB

**Build Release APK:**
```bash
cd jamz-client-vite

# 1. Rebuild with latest code
npm run build
npx cap sync android

# 2. Generate release APK
cd android
./gradlew assembleRelease

# Output: android/app/build/outputs/apk/release/app-release-unsigned.apk
```

**Sign APK (Required for Google Play):**
```bash
# 1. Generate keystore (first time only)
keytool -genkey -v -keystore trafficjamz-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias trafficjamz

# 2. Sign APK
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 -keystore trafficjamz-release-key.jks app-release-unsigned.apk trafficjamz

# 3. Zipalign
zipalign -v 4 app-release-unsigned.apk TrafficJamz-release.apk
```

**Or Build AAB (Recommended for Google Play):**
```bash
cd android
./gradlew bundleRelease

# Output: android/app/build/outputs/bundle/release/app-release.aab
# Sign with same keystore
```

**Manual Testing:**
1. [ ] Install on Motorola Razr via ADB or direct transfer
2. [ ] Launch app and test all features
3. [ ] Test GPS/location permissions
4. [ ] Test camera/microphone permissions
5. [ ] Test notifications
6. [ ] Test background operation
7. [ ] Test battery impact
8. [ ] Verify app permissions in settings

---

### iOS (Apple App Store)
**Status:** Configured but not built (requires macOS + Xcode)

**Requirements:**
- [ ] MacBook Pro with Xcode installed
- [ ] Apple Developer Account ($99/year)
- [ ] iOS device for testing

**Build Steps (when ready):**
```bash
cd jamz-client-vite
npm run build
npx cap sync ios
npx cap open ios

# In Xcode:
# 1. Configure signing with Apple Developer account
# 2. Select target device or Generic iOS Device
# 3. Product → Archive
# 4. Distribute App → App Store Connect
# 5. Upload to TestFlight
```

**Manual Testing:**
1. [ ] Install via TestFlight on iPhone
2. [ ] Test all features
3. [ ] Test push notifications
4. [ ] Test background modes
5. [ ] Test cellular vs WiFi
6. [ ] Submit for App Store review

---

### macOS (Mac App Store)
**Status:** Not configured

**Requirements:**
- [ ] MacBook Pro
- [ ] Xcode
- [ ] Apple Developer Account
- [ ] Mac signing certificates

**Build Steps (when ready):**
```bash
cd jamz-client-vite
npm run electron:build:mac

# Package for Mac App Store requires additional steps
# - Create Mac App Store provisioning profile
# - Sign with Mac App Store certificate (not Developer ID)
# - Create PKG installer with productbuild
```

---

## 🚀 Store Submission Checklists

### Google Play Console
- [ ] Create app in Google Play Console
- [ ] Upload signed APK/AAB
- [ ] Fill app details (title, description, screenshots)
- [ ] Set content rating
- [ ] Set pricing (Free)
- [ ] Privacy policy URL
- [ ] Submit for review

**Required Assets:**
- Screenshots (min 2): 1080x1920 or higher
- Feature graphic: 1024x500
- App icon: 512x512
- Privacy policy URL

### Microsoft Partner Center
- [ ] Create app in Partner Center
- [ ] Upload MSIX package
- [ ] Fill app details (title, description, screenshots)
- [ ] Set age rating
- [ ] Set pricing (Free)
- [ ] Privacy policy URL
- [ ] Submit for certification

**Required Assets:**
- Screenshots (min 1): 1366x768 or higher
- Store logos: 300x300, 150x150, 71x71
- App icon: 512x512
- Privacy policy URL

### Apple App Store (iOS + macOS)
- [ ] Create app in App Store Connect
- [ ] Upload IPA via Xcode or Transporter
- [ ] Fill app details (title, subtitle, description)
- [ ] Set age rating
- [ ] Set pricing (Free)
- [ ] Privacy policy URL
- [ ] Submit for review

**Required Assets:**
- Screenshots for all device sizes (iPhone, iPad)
- App icon: 1024x1024
- Privacy policy URL
- App preview videos (optional but recommended)

---

## 📊 Test Execution Plan

### Phase 1: Automated Testing (TODAY - 30 minutes)
```bash
cd jamz-client-vite
npm run test:quick              # Quick smoke tests
npm run test:auth              # Authentication tests
npm run test:navigation        # Navigation tests
```

### Phase 2: Windows Testing (TODAY - 1 hour)
1. Install `TrafficJamz Setup 1.0.9.exe` on test machine
2. Run manual testing checklist
3. Document any issues
4. Create MSIX package for Microsoft Store

### Phase 3: Android Build & Testing (TODAY - 1 hour)
1. Build signed release APK/AAB
2. Install on Motorola Razr
3. Run manual testing checklist
4. Document any issues

### Phase 4: iOS/macOS Planning (THIS WEEK)
1. Research MacBook Pro options
2. Set up Apple Developer Account
3. Plan iOS/macOS build timeline

---

## 📝 Notes

### Known Issues to Verify Fixed
- ✅ Desktop icon showing Electron default (should be TrafficJamz logo)
- ✅ "User not authenticated" errors after Clerk login
- ✅ Music controls standardized across pages
- ✅ iOS Safari loading timeout (10s failsafe)

### Version Information
- **Current Version:** 1.0.9
- **Release Date:** March 17, 2026
- **Build Type:** Production
- **Backend:** https://trafficjamz.v2u.us
- **Frontend:** https://jamz.v2u.us

### Contact Information
- **Developer:** Rich O'Brien
- **Email:** richcobrien@hotmail.com
- **Project:** TrafficJamz

---

## ✅ Success Criteria

Before submitting to stores, ensure:
- [ ] All core features work on all platforms
- [ ] No critical bugs reported
- [ ] Automated tests passing (>95% pass rate)
- [ ] Manual testing checklist 100% complete
- [ ] Privacy policy published and linked
- [ ] Store assets prepared (screenshots, icons, descriptions)
- [ ] Signing certificates/keys secured and backed up
- [ ] Version number consistent across all platforms

---

**Last Updated:** March 17, 2026
