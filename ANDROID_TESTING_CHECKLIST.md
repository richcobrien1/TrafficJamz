# Android Native App Testing Checklist
**Date:** March 15, 2026  
**Platform:** Android (Capacitor)  
**Build Location:** `mobile/Android/`

---

## 🚀 Pre-Testing Setup

### 1. Build Latest Version
```bash
# From TrafficJamz root
cd jamz-client-vite
npm run build
npx cap sync android
```

### 2. Open in Android Studio
```bash
npx cap open android
```

### 3. Device Preparation
- [ ] Enable Developer Options on Android device
- [ ] Enable USB Debugging
- [ ] Connect device via USB (or use emulator)
- [ ] Verify device shows in `adb devices`

---

## 📱 Test Devices Priority

### Critical (Must Test)
- [ ] **Physical Device**: Samsung Galaxy S24/S23 (Android 14)
- [ ] **Physical Device**: Google Pixel 8/7 (Android 14)
- [ ] **Emulator**: Pixel 7 API 34 (Android 14)

### Nice to Have
- [ ] OnePlus/Motorola device (OEM skin testing)
- [ ] Older device with Android 12/13
- [ ] Tablet (10" screen)

---

## ✅ Core Functionality Tests

### 1. App Installation & Launch
- [ ] APK installs successfully
- [ ] App icon appears in launcher
- [ ] App launches without crash
- [ ] Splash screen displays correctly
- [ ] No immediate errors in logcat

### 2. Authentication (Clerk)
- [ ] Login page loads
- [ ] Email/password login works
- [ ] Google OAuth login works
- [ ] Session persists after app restart
- [ ] Logout works properly
- [ ] Token refresh works in background

### 3. Dashboard
- [ ] Groups list loads
- [ ] Pull-to-refresh works
- [ ] Group cards display properly
- [ ] Navigation drawer opens smoothly
- [ ] FAB button works
- [ ] AI Chat Assistant accessible

### 4. Group Details
- [ ] Group info displays
- [ ] Member list loads
- [ ] Avatar images load
- [ ] Back navigation works
- [ ] Action buttons (Audio/Location/Invite) work

### 5. Location Tracking
- [ ] Location permission requested
- [ ] GPS location acquired
- [ ] Map displays (Google Maps)
- [ ] Real-time location updates work
- [ ] Location sharing with group works
- [ ] Background location tracking works
- [ ] Battery optimization settings handled

### 6. Audio Sessions
- [ ] Microphone permission requested
- [ ] WebRTC audio connects
- [ ] Can hear other group members
- [ ] Can be heard by others
- [ ] Push-to-talk works (if implemented)
- [ ] Audio works with screen off
- [ ] Audio persists during app backgrounding

### 7. Music Playback
- [ ] Music player UI displays
- [ ] Spotify integration works
- [ ] Apple Music integration works
- [ ] Playback controls work (play/pause/skip)
- [ ] Progress bar syncs
- [ ] Album art displays
- [ ] Background playback works

### 8. Notifications
- [ ] Notification permission requested
- [ ] Push notifications received
- [ ] Notifications display correctly
- [ ] Tapping notification opens correct screen
- [ ] Notification badges work
- [ ] Sound/vibration settings respected

---

## 🎨 UI/UX Tests

### Layout & Design
- [ ] Safe area insets (notch/camera cutout) handled
- [ ] No text cutoff on small screens
- [ ] Touch targets minimum 48dp
- [ ] No horizontal scrolling issues
- [ ] Dark mode works (if supported)
- [ ] Fonts render correctly
- [ ] Images scale properly

### Responsiveness
- [ ] Portrait orientation works
- [ ] Landscape orientation works
- [ ] Screen rotation smooth (no flicker)
- [ ] Keyboard doesn't cover input fields
- [ ] Soft keyboard dismiss works

### Gestures
- [ ] Swipe gestures work
- [ ] Pull-to-refresh works
- [ ] Long-press actions work
- [ ] Pinch-to-zoom (if applicable)
- [ ] Back button navigation correct

---

## 🔋 Performance & Battery

### App Performance
- [ ] App launch time < 3 seconds
- [ ] Smooth scrolling (60fps)
- [ ] No ANR (Application Not Responding) errors
- [ ] Memory usage reasonable (< 200MB idle)
- [ ] CPU usage normal (< 20% idle)

### Battery Impact
- [ ] No excessive battery drain
- [ ] Background services optimized
- [ ] Doze mode handled correctly
- [ ] Battery optimization warnings shown

### Network
- [ ] Works on WiFi
- [ ] Works on 4G/5G
- [ ] Handles network switching
- [ ] Offline mode graceful
- [ ] Reconnection after network loss

---

## 🔐 Permissions & Security

### Runtime Permissions
- [ ] Location (fine & coarse)
- [ ] Microphone
- [ ] Notifications
- [ ] Camera (if used)
- [ ] Storage/Photos (if used)
- [ ] Permission rationale shown
- [ ] Graceful handling when denied

### Security
- [ ] HTTPS connections only
- [ ] SSL cert validation works
- [ ] Tokens stored securely
- [ ] No sensitive data in logs
- [ ] Firebase security rules enforced

---

## 🐛 Common Android Issues to Check

### Capacitor-Specific
- [ ] WebView version compatibility (Chrome 90+)
- [ ] JavaScript bridge works
- [ ] Native plugins load correctly
- [ ] File access works
- [ ] Camera/media access works

### Android-Specific Bugs
- [ ] Back button behavior correct
- [ ] App doesn't crash on rotation
- [ ] No memory leaks
- [ ] Services properly stopped
- [ ] Broadcast receivers registered/unregistered

### OEM-Specific
- [ ] Samsung: One UI quirks
- [ ] Xiaomi: MIUI battery restrictions
- [ ] Huawei: AppGallery compatibility
- [ ] OnePlus: OxygenOS gestures

---

## 📊 Testing Tools

### ADB Commands
```bash
# Check logs
adb logcat | grep -i trafficjamz

# Clear app data
adb shell pm clear com.trafficjamz.app

# Install APK
adb install -r app-debug.apk

# Check battery stats
adb shell dumpsys batterystats com.trafficjamz.app
```

### Android Studio Tools
- [ ] Logcat for crash logs
- [ ] Profiler for CPU/Memory
- [ ] Network Inspector
- [ ] Database Inspector (if using SQLite)

---

## 🚨 Critical Issues (Stop & Fix)

If any of these occur, stop testing and fix immediately:
- ❌ App crashes on launch
- ❌ Cannot login/authenticate
- ❌ Location tracking completely broken
- ❌ Audio sessions don't connect
- ❌ Excessive battery drain (> 20%/hour)
- ❌ Data leaks or security issues

---

## 📝 Bug Reporting Template

```markdown
**Device**: Samsung Galaxy S24
**Android Version**: 14
**App Version**: 1.0.0 (build 1)
**Issue**: [Brief description]

**Steps to Reproduce**:
1. 
2. 
3. 

**Expected**: [What should happen]
**Actual**: [What actually happens]

**Logs**: [Paste logcat output]
**Screenshots**: [Attach if relevant]
**Frequency**: Always / Sometimes / Rare
**Severity**: Critical / High / Medium / Low
```

---

## ✅ Sign-Off Criteria

App is ready for production when:
- [ ] All critical functionality works
- [ ] No crashes or ANRs
- [ ] Performance acceptable (< 3s launch, smooth UI)
- [ ] Battery usage reasonable
- [ ] All permissions handled properly
- [ ] Works on at least 2 physical devices
- [ ] Tested on Android 12, 13, 14
- [ ] Logcat shows no critical errors

---

## 🎯 Quick Test Script (15 minutes)

**Speed test for basic functionality:**
1. ✅ Install & launch app (1 min)
2. ✅ Login with Google (1 min)
3. ✅ View groups dashboard (1 min)
4. ✅ Open group detail (1 min)
5. ✅ Start location tracking (2 min)
6. ✅ Join audio session (3 min)
7. ✅ Play music (2 min)
8. ✅ Test notifications (2 min)
9. ✅ Background app & return (1 min)
10. ✅ Logout & exit (1 min)

**Pass Criteria**: All 10 steps work without crashes or major bugs.

---

## 📚 Related Documentation
- [BUILD_ANDROID.md](docs/BUILD_ANDROID.md) - Build instructions
- [MOBILE_TESTING_GUIDE.md](MOBILE_TESTING_GUIDE.md) - Responsive design tests
- [QA_TESTING_STATUS.md](QA_TESTING_STATUS.md) - Overall test status
- [BUILD_EXPORT_SUMMARY_MARCH_11_2026.md](BUILD_EXPORT_SUMMARY_MARCH_11_2026.md) - Export details

---

**Ready for Testing**: ✅  
**Last Updated**: March 14, 2026  
**Tester**: _____________  
**Status**: PENDING
