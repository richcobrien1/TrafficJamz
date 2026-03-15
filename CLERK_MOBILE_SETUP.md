# Clerk Mobile Configuration for TrafficJamz

## Issue
Clerk authentication not working in Android/iOS native apps built with Capacitor.

## Root Cause
Clerk needs specific origins whitelisted. Native Capacitor apps run on `capacitor://localhost` (or `https://localhost` with androidScheme), not your web domain.

## Fix - Clerk Dashboard Configuration

### 1. Login to Clerk Dashboard
Go to: https://dashboard.clerk.com and select your application

### 2. Configure Domain Settings

**Go to: Domains** (in left sidebar)

Add your production domain:
- Click "Add domain"
- Enter: `jamz.v2u.us`
- Verify the domain if needed

### 3. Configure Development Origins (Optional)

For local development, Clerk usually auto-allows `localhost` origins. If you have issues:

**Go to: API Keys** (in left sidebar)
- Scroll down to "Authorized origins" section
- Ensure `http://localhost:5174` and `http://localhost:5175` are listed

### 4. Configure Redirect URLs for OAuth

**Go to: Paths** (in left sidebar under "User & Authentication")
- Find "Sign-up URL" and "Sign-in URL" sections
- These control where Clerk redirects after auth

### 5. Configure Native Applications (Critical for Mobile)

**Go to: Configure > User & authentication > Native applications**

1. **Enable Native API**
   - Toggle "Enable Native API" to ON
   - This allows Clerk to work with native iOS and Android apps

2. **Add Android Application**
   - Click the "Android" tab
   - Click "+ Add Android app" button
   - Configure your app (package name, etc.)

3. **Configure Redirect URLs**
   - Scroll down to "Allowlist for mobile SSO redirect"
   - Add redirect URLs for your Capacitor app:
     - `https://jamz.v2u.us/oauth-callback` (production web)
     - `https://localhost/oauth-callback` (Capacitor Android with androidScheme)
     - `capacitor://localhost/oauth-callback` (fallback if androidScheme not working)

4. **Add iOS Application** (when ready)
   - Click the "iOS" tab
   - Click "+ Add iOS app" button
   - Configure your iOS app

### 6. Mobile App Configuration

The app is already configured with:
- `androidScheme: "https"` in capacitor.config.json
- This makes the app run on `https://localhost` instead of `capacitor://localhost`
- More compatible with web auth libraries like Clerk

## Testing

### Test in Web Browser First
1. Visit https://jamz.v2u.us
2. Try to login with Clerk
3. If web works, the publishable key is correct

### Test Android App
1. Install APK on device
2. Open app
3. Enable Chrome remote debugging:
   - Connect phone via USB
   - Chrome → `chrome://inspect`
   - Select WebView from your app
4. Check console for Clerk errors

### Common Issues

**Issue: "Clerk: Invalid publishable key"**
- The key is hardcoded in the build
- Check: `grep -r "pk_live" jamz-client-vite/dist/assets/*.js`
- Rebuild if key is missing

**Issue: "Clerk: Network request failed"**
- Check internet connection on device
- Verify HTTPS scheme is set in capacitor.config.json

**Issue: Clerk loads but can't authenticate**
- Clerk might not support Capacitor web views
- **Solution:** Implement custom backend authentication instead of Clerk

## Alternative: Custom Backend Authentication

If Clerk doesn't work in Capacitor, use your backend instead:

1. **User registers/logs in via backend API:**
   ```javascript
   // In your app
   const response = await fetch('https://trafficjamz.v2u.us/api/auth/login', {
     method: 'POST',
     body: JSON.stringify({ email, password })
   });
   const { token } = await response.json();
   localStorage.setItem('token', token);
   ```

2. **Use JWT tokens from your backend**
   - Your backend already has auth at `/api/auth/login`
   - Bypass Clerk for mobile, use for web only

3. **Conditional Clerk Loading:**
   ```javascript
   // In App.jsx
   const isMobile = Capacitor.isNativePlatform();
   
   if (isMobile) {
     // Use custom auth
     return <MobileAuthProvider>...</MobileAuthProvider>;
   } else {
     // Use Clerk for web
     return <ClerkProvider>...</ClerkProvider>;
   }
   ```

## Current Environment Variables

✅ Already configured in `.env.production`:
```
VITE_CLERK_PUBLISHABLE_KEY=pk_live_Y2xlcmsuamFtei52MnUudXMk
```

This gets baked into the build at compile time by Vite.

## Debug Commands

Check if Clerk key is in the build:
```bash
grep -r "pk_live" jamz-client-vite/dist/assets/*.js
```

Check Capacitor config:
```bash
cat jamz-client-vite/capacitor.config.json
```
