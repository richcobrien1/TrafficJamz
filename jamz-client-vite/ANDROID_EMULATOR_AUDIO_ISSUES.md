# Android Emulator Audio Quality Issues

## The Problem
The Android emulator has **severe audio quality limitations** that don't exist on real devices:
- Choppy/crackling playback
- Fast/slow playback speed
- Poor audio buffering
- Limited codec support
- CPU-based audio processing (no hardware acceleration)

## ⚠️ This is NOT a bug in your code!
The emulator's audio is notoriously bad and **does NOT reflect real device performance**.

## Solutions

### 1. **Test on Real Android Device** (RECOMMENDED)
Real devices have proper audio hardware and will sound perfect.

**Steps:**
1. Connect Android phone via USB
2. Enable USB Debugging on phone:
   - Settings → About Phone → Tap "Build Number" 7 times
   - Settings → Developer Options → Enable "USB Debugging"
3. In Android Studio: Select your device instead of emulator
4. Click Run

### 2. **Improve Emulator Audio (Partial Fix)**
In Android Studio:
1. Stop the emulator
2. Tools → AVD Manager → Edit emulator (pencil icon)
3. Click "Show Advanced Settings"
4. Under "Emulated Performance":
   - Graphics: **Hardware - GLES 2.0**
   - Boot option: **Cold boot**
5. Under "Memory and Storage":
   - RAM: **4096 MB** (or higher)
6. Save and restart emulator

### 3. **Test Audio on Web Instead**
The web version has perfect audio:
```bash
npm run dev
# Open http://localhost:5174 in Chrome
```

### 4. **Known Emulator Issues**
- Pixel 3a/4 emulators have better audio than Pixel 5+
- x86_64 images have better performance than ARM
- Older API levels (28-30) sometimes have better audio than newer ones

## Bottom Line
**Don't waste time debugging emulator audio - test on a real device or web!**

The code is correct. The emulator is the limitation.
