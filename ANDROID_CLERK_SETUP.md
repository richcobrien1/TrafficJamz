# Android App Configuration for Clerk Dashboard

## Problem
Native Android app not configured in Clerk Dashboard, preventing authentication from working.

## Solution: Configure Android App in Clerk Dashboard

### Step 1: Login to Clerk Dashboard
Go to: https://dashboard.clerk.com  
Select your TrafficJamz application

### Step 2: Navigate to Native Applications
1. Click **Configure** in left sidebar
2. Click **User & authentication**
3. Click **Native applications**

### Step 3: Enable Native API
- Toggle **"Enable Native API"** to **ON**
- This allows Clerk to work with native mobile apps

### Step 4: Add Android Application
1. Click the **Android** tab
2. Click **"+ Add Android app"** button
3. Fill in the configuration:
   - **Package Name:** `com.trafficjamz.app`
   - **SHA-256 Fingerprint:** (Generate using command below)

### Step 5: Configure Redirect URLs
Scroll down to **"Allowlist for mobile SSO redirect"**

Add these redirect URLs:
- `https://jamz.v2u.us/oauth-callback` (production web)
- `https://localhost/oauth-callback` (Android with androidScheme)
- `trafficjamz://oauth-callback` (deep link fallback)

### Step 6: Save Configuration
Click **Save** at the bottom of the page

---

## Generate SHA-256 Fingerprint for Debug Build

For debug builds, generate the SHA-256 fingerprint:

```bash
cd mobile/Android
./gradlew signingReport
```

Or using keytool directly:
```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

Copy the **SHA256** fingerprint and paste it into Clerk Dashboard.

---

## Current Android Configuration

**Capacitor Config** (`jamz-client-vite/capacitor.config.json`):
```json
{
  "appId": "com.trafficjamz.app",
  "appName": "TrafficJamz",
  "server": {
    "androidScheme": "https"
  }
}
```

**AndroidManifest.xml** - Deep linking configured:
```xml
<intent-filter android:autoVerify="true">
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="trafficjamz" />
</intent-filter>
```

---

## After Configuration

### Rebuild Android APK
```bash
cd jamz-client-vite
npm run build
npx cap sync android
cd ../mobile/Android
./gradlew assembleDebug
```

### Install on Device
```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

### Test Authentication
1. Open TrafficJamz app on Android device
2. Try to login with Clerk
3. Check Chrome remote debugging for any errors:
   - Chrome → `chrome://inspect`
   - Select WebView from TrafficJamz app

---

## Troubleshooting

### Issue: "Clerk: Invalid publishable key"
- **Solution:** The key is hardcoded in the build. Rebuild the app.

### Issue: "Clerk: Network request failed"
- **Solution:** Check internet connection. Verify `androidScheme: "https"` in capacitor.config.json

### Issue: Authentication works in browser but not in app
- **Solution:** Verify Android app is added to Clerk Dashboard (steps above)

### Issue: OAuth redirect not working
- **Solution:** Ensure redirect URLs are added to allowlist in Clerk Dashboard

---

## Quick Checklist

- [ ] Login to Clerk Dashboard
- [ ] Navigate to Configure → User & authentication → Native applications
- [ ] Enable Native API
- [ ] Add Android app with package name: `com.trafficjamz.app`
- [ ] Generate and add SHA-256 fingerprint
- [ ] Add redirect URLs to allowlist
- [ ] Save configuration
- [ ] Rebuild Android APK
- [ ] Install and test on device

---

**Last Updated:** March 14, 2026  
**Status:** ⏳ Waiting for Clerk Dashboard configuration
