# Build TrafficJamz Android App

## Prerequisites
- Android Studio installed
- Node.js and npm installed
- Java JDK 11 or higher

## Build Steps

### 1. Build the Web App (Production)
```bash
cd jamz-client-vite
npm run build
```

### 2. Sync Capacitor with Android
```bash
npx cap sync android
```

### 3. Open in Android Studio
```bash
npx cap open android
```

### 4. Run on Device/Emulator
- In Android Studio, click the green "Run" button
- Or use command line:
```bash
cd mobile/Android
./gradlew assembleDebug
```

## Development Workflow

### For Quick Testing (Dev Mode)
```bash
# Terminal 1 - Run Vite dev server
cd jamz-client-vite
npm run dev

# Terminal 2 - Update Capacitor config to use local dev server
# Edit capacitor.config.json and add:
{
  "server": {
    "url": "http://192.168.1.XXX:5174",  // Your computer's local IP
    "cleartext": true
  }
}

# Then sync and run
npx cap sync android
npx cap run android
```

### For Production Build
```bash
cd jamz-client-vite
npm run build
npx cap sync android
npx cap open android
# Build signed APK in Android Studio
```

## Environment Variables
The app will use the production backend: `https://trafficjamz.onrender.com`

Make sure your `.env.production` has:
```
VITE_BACKEND_URL=https://trafficjamz.onrender.com
VITE_API_BASE=https://trafficjamz.onrender.com/api
```

## Troubleshooting

### WebRTC/Audio Not Working
- Check microphone permissions in Settings > Apps > TrafficJamz > Permissions
- Ensure RECORD_AUDIO permission is granted
- Check logcat for errors: `adb logcat | grep TrafficJamz`

### Network Errors
- Make sure your phone has internet connection
- Check that backend URL is accessible from mobile network
- Verify CORS is configured on backend for mobile requests

### Build Errors
```bash
# Clean and rebuild
cd mobile/Android
./gradlew clean
./gradlew assembleDebug
```

## Testing the App

1. **Login** - Use your existing TrafficJamz account
2. **Join Group** - Navigate to your group
3. **Audio Session** - Click to start audio session
4. **Grant Mic Permission** - Allow microphone access when prompted
5. **Test Audio** - Speak and check the input level meter

## Performance Tips

- Build release version for better performance: `./gradlew assembleRelease`
- Enable Proguard for production builds
- Monitor memory usage in Android Studio profiler
