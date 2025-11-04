# Native Mobile Audio Setup

## Why This Matters
Web browsers (Safari, Chrome) cannot control device volume for security reasons. Native iOS/Android apps have full audio control.

## Required Plugins

### 1. Background Audio & Media Controls
```bash
npm install @capacitor/background-task
npm install capacitor-native-audio
npm install cordova-plugin-media
```

### 2. Volume Control Plugin
```bash
npm install capacitor-volume-buttons
```

### 3. Audio Session Management (iOS)
Add to `capacitor.config.json`:
```json
{
  "plugins": {
    "BackgroundTask": {
      "enabled": true
    },
    "CapacitorAudio": {
      "enabled": true,
      "backgroundAudio": true
    }
  }
}
```

### 4. iOS Configuration
Add to `ios/App/App/Info.plist`:
```xml
<key>UIBackgroundModes</key>
<array>
    <key>audio</key>
</array>
<key>NSMicrophoneUsageDescription</key>
<string>TrafficJamz needs microphone access for voice communication</string>
```

### 5. Android Configuration
Add to `android/app/src/main/AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
```

## Code Changes Needed

### Create Native Audio Service
`src/services/native-audio.service.js`:
```javascript
import { Capacitor } from '@capacitor/core';

export const isNativeApp = () => {
  return Capacitor.isNativePlatform();
};

export const setSystemVolume = async (volume) => {
  if (!isNativeApp()) {
    console.warn('System volume control only works in native apps');
    return;
  }
  
  try {
    const { VolumeButtons } = await import('capacitor-volume-buttons');
    await VolumeButtons.setVolume({ volume: volume }); // 0-1
  } catch (error) {
    console.error('Failed to set system volume:', error);
  }
};

export const getSystemVolume = async () => {
  if (!isNativeApp()) return null;
  
  try {
    const { VolumeButtons } = await import('capacitor-volume-buttons');
    const result = await VolumeButtons.getVolume();
    return result.volume;
  } catch (error) {
    console.error('Failed to get system volume:', error);
    return null;
  }
};

export const setupBackgroundAudio = async () => {
  if (!isNativeApp()) return;
  
  try {
    const { BackgroundTask } = await import('@capacitor/background-task');
    await BackgroundTask.beforeExit(async () => {
      // Keep audio playing in background
      console.log('App entering background - audio continues');
    });
  } catch (error) {
    console.error('Failed to setup background audio:', error);
  }
};
```

### Update AudioSession.jsx
Add platform detection:
```javascript
import { Capacitor } from '@capacitor/core';
import { setSystemVolume, getSystemVolume, isNativeApp } from '../../services/native-audio.service';

// In your component:
const [isNative] = useState(Capacitor.isNativePlatform());

// Update volume handler:
const handleVolumeChange = async (newVolume) => {
  if (isNative) {
    // Native app - control device volume
    await setSystemVolume(newVolume);
  } else {
    // Web browser - control audio element volume
    setOutputVolume(newVolume);
  }
};
```

## Benefits After Implementation

✅ **Full volume control** on native apps (iOS & Android)
✅ **Background audio** continues playing when app is minimized
✅ **Lock screen controls** with track info, play/pause
✅ **Hardware volume buttons** adjust app audio
✅ **No autoplay restrictions** in native apps
✅ **Better battery management** with native audio APIs
✅ **System audio integration** (proper mixing with other apps)

## Testing

### iOS
```bash
npm run mobile:ios
# Test in Xcode simulator or real device
```

### Android
```bash
npm run mobile:android
# Test in Android Studio emulator or real device
```

## Current State
- ✅ Capacitor installed and configured
- ❌ Native audio plugins not installed
- ❌ Volume control code using web APIs only
- ⚠️ Works in browser with limitations
- 🎯 Will work fully when deployed as native app with plugins

## Next Steps
1. Install the plugins listed above
2. Add the native audio service
3. Update AudioSession to use native APIs when available
4. Test on iOS and Android devices
5. Submit to App Store / Play Store
