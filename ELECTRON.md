# Electron Desktop App Icon Embedding Guide

This guide provides **battle-tested instructions** for properly embedding custom icons into Electron desktop applications on Windows, macOS, and Linux. Based on real-world troubleshooting and successful implementation in TrafficJamz.

---

## Table of Contents

1. [Overview](#overview)
2. [Icon File Requirements](#icon-file-requirements)
3. [Project Setup](#project-setup)
4. [Implementation Steps](#implementation-steps)
5. [Troubleshooting](#troubleshooting)
6. [Verification](#verification)
7. [Platform-Specific Notes](#platform-specific-notes)

---

## Overview

### The Problem

By default, Electron apps display a generic Electron logo icon on:
- Desktop shortcuts
- Windows taskbar
- macOS dock
- Linux launchers
- App executables
- Start Menu / Applications folder

### The Solution

Properly embed custom icons using:
1. Correct icon file formats for each platform
2. electron-builder configuration
3. **afterPack hook** for Windows (critical!)
4. rcedit tool for Windows icon embedding

### Why afterPack Hook?

**Timing is everything!** The icon must be embedded:
- ✅ **AFTER** the app is packaged
- ✅ **BEFORE** the installer is created

The `afterPack` hook runs at exactly the right time in electron-builder's build process.

---

## Icon File Requirements

### Windows (Required: .ico)

**File:** `build/icon.ico`

**Format Requirements:**
- Format: ICO (not PNG renamed to .ico!)
- Color depth: 32-bit with alpha channel
- Recommended sizes in one .ico file:
  - 16x16 pixels (small icons)
  - 32x32 pixels (taskbar)
  - 48x48 pixels (desktop shortcuts)
  - 256x256 pixels (large tiles)

**How to Create .ico:**

Online tools:
- https://icoconvert.com/
- https://convertico.com/

Command line (ImageMagick):
```bash
convert icon.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico
```

### macOS (Required: .icns or .png)

**File:** `build/icon.icns` (preferred) or `build/icon.png`

**Format Requirements:**
- Format: ICNS or PNG
- Size: 1024x1024 pixels minimum
- Recommended: 512x512 @ 1x, 1024x1024 @ 2x (Retina)

**How to Create .icns:**

Using iconutil (macOS only):
```bash
# 1. Create iconset folder structure
mkdir icon.iconset
# 2. Add different sizes (icon_16x16.png, icon_32x32.png, etc.)
# 3. Convert to .icns
iconutil -c icns icon.iconset
```

Online tools:
- https://cloudconvert.com/png-to-icns

### Linux (Required: .png)

**File:** `build/icon.png`

**Format Requirements:**
- Format: PNG
- Size: 512x512 pixels (or 1024x1024)
- Transparent background recommended

---

## Project Setup

### 1. Install Dependencies

Add to `package.json`:

```json
{
  "devDependencies": {
    "electron": "^26.0.0",
    "electron-builder": "^24.0.0",
    "rcedit": "^4.0.0"
  }
}
```

Then install:
```bash
npm install --save-dev electron-builder rcedit
```

**Why rcedit?**
- Windows tool to embed icons into .exe files
- electron-builder's built-in icon handling is unreliable
- Gives you control and verification

### 2. Project Structure

```
your-electron-app/
├── build/
│   ├── icon.ico      (Windows)
│   ├── icon.icns     (macOS - optional if using .png)
│   └── icon.png      (macOS & Linux)
├── electron/
│   ├── main.cjs      (or main.js)
│   └── preload.cjs
├── scripts/
│   └── afterPack.cjs (CRITICAL FOR WINDOWS!)
├── package.json
└── electron-builder.yml (or config in package.json)
```

---

## Implementation Steps

### Step 1: Configure electron-builder

**Option A: In package.json**

```json
{
  "build": {
    "appId": "com.yourcompany.yourapp",
    "productName": "YourApp",
    "afterPack": "scripts/afterPack.cjs",
    "directories": {
      "output": "dist-electron",
      "buildResources": "build"
    },
    "files": [
      "dist/**/*",
      "electron/**/*",
      "build/icon.*",
      "package.json"
    ],
    "win": {
      "target": ["nsis"],
      "icon": "build/icon.ico"
    },
    "mac": {
      "target": ["dmg", "zip"],
      "icon": "build/icon.icns",
      "category": "public.app-category.productivity"
    },
    "linux": {
      "target": ["AppImage", "deb"],
      "icon": "build/icon.png",
      "category": "Utility"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true,
      "installerIcon": "build/icon.ico",
      "uninstallerIcon": "build/icon.ico"
    }
  }
}
```

**Option B: In electron-builder.yml**

```yaml
appId: com.yourcompany.yourapp
productName: YourApp
afterPack: scripts/afterPack.cjs

directories:
  output: dist-electron
  buildResources: build

files:
  - dist/**/*
  - electron/**/*
  - build/icon.*
  - package.json

win:
  target: nsis
  icon: build/icon.ico

mac:
  target:
    - dmg
    - zip
  icon: build/icon.icns
  category: public.app-category.productivity

linux:
  target:
    - AppImage
    - deb
  icon: build/icon.png
  category: Utility

nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: always
  createStartMenuShortcut: true
  installerIcon: build/icon.ico
  uninstallerIcon: build/icon.ico
```

**⚠️ CRITICAL:** If you use both package.json AND electron-builder.yml, make sure `afterPack` is defined in **BOTH**. electron-builder may prioritize one over the other.

### Step 2: Create afterPack Hook Script

Create `scripts/afterPack.cjs`:

```javascript
/**
 * electron-builder afterPack hook
 * Embeds icon into Windows exe after packaging but before installer creation
 */
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');

exports.default = async function(context) {
  // Only run for Windows builds
  if (context.electronPlatformName !== 'win32') {
    console.log('⏭️  Skipping icon embedding (not Windows)');
    return;
  }
  
  const appOutDir = context.appOutDir;
  const exePath = path.join(appOutDir, `${context.packager.appInfo.productFilename}.exe`);
  const iconPath = path.join(context.packager.projectDir, 'build', 'icon.ico');
  
  // Locate rcedit
  const possibleRceditPaths = [
    path.join(context.packager.projectDir, 'node_modules', 'rcedit', 'bin', 'rcedit.exe'),
    path.join(context.packager.projectDir, 'node_modules', '.bin', 'rcedit.exe'),
    path.join(__dirname, '..', 'node_modules', 'rcedit', 'bin', 'rcedit.exe'),
  ];
  
  let rceditPath = null;
  for (const testPath of possibleRceditPaths) {
    if (fs.existsSync(testPath)) {
      rceditPath = testPath;
      break;
    }
  }
  
  if (!rceditPath) {
    console.error('\n❌ ERROR: rcedit.exe not found!');
    console.error('Install it: npm install --save-dev rcedit');
    throw new Error('rcedit.exe not found');
  }
  
  if (!fs.existsSync(iconPath)) {
    console.error(`\n❌ ERROR: Icon file not found: ${iconPath}`);
    throw new Error('Icon file not found');
  }
  
  console.log('\n🎨 ========================================');
  console.log('🎨 EMBEDDING ICON INTO EXE');
  console.log('🎨 ========================================');
  console.log('📄 EXE:', exePath);
  console.log('🖼️  Icon:', iconPath);
  console.log('🔧 rcedit:', rceditPath);
  console.log('');
  
  try {
    execFileSync(rceditPath, [
      exePath,
      '--set-icon', iconPath,
      '--set-version-string', 'CompanyName', 'Your Company Name',
      '--set-version-string', 'FileDescription', 'Your App Description',
      '--set-version-string', 'ProductName', 'Your App Name',
      '--set-version-string', 'InternalName', 'YourAppName',
      '--set-version-string', 'OriginalFilename', 'YourAppName.exe',
    ], {
      stdio: 'inherit'
    });
    
    console.log('\n✅ ========================================');
    console.log('✅ ICON EMBEDDED SUCCESSFULLY!');
    console.log('✅ ========================================\n');
  } catch (error) {
    console.error('\n❌ FAILED TO EMBED ICON');
    console.error('❌', error.message);
    throw error;
  }
};
```

### Step 3: Configure Main Electron Process (Optional)

In `electron/main.cjs` or `electron/main.js`:

```javascript
const { app, BrowserWindow, nativeImage } = require('electron');
const path = require('path');

// Set app user model ID for proper Windows taskbar icon
if (process.platform === 'win32') {
  app.setAppUserModelId('com.yourcompany.yourapp');
}

function createWindow() {
  // Load icon
  let iconPath;
  if (process.platform === 'win32') {
    iconPath = path.join(__dirname, '..', 'build', 'icon.ico');
  } else if (process.platform === 'darwin') {
    iconPath = path.join(__dirname, '..', 'build', 'icon.icns');
  } else {
    iconPath = path.join(__dirname, '..', 'build', 'icon.png');
  }
  
  const icon = nativeImage.createFromPath(iconPath);
  
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: icon,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  
  // For Windows: explicitly set icon and overlay icon
  if (process.platform === 'win32' && !icon.isEmpty()) {
    mainWindow.setIcon(icon);
    mainWindow.setOverlayIcon(icon, 'Your App Name');
  }
  
  // ... rest of your window setup
}
```

### Step 4: Build Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "electron:build": "electron-builder",
    "electron:build:win": "electron-builder --win",
    "electron:build:mac": "electron-builder --mac",
    "electron:build:linux": "electron-builder --linux"
  }
}
```

### Step 5: Build Your App

```bash
# Windows
npm run electron:build:win

# macOS
npm run electron:build:mac

# Linux
npm run electron:build:linux

# All platforms
npm run electron:build
```

**What to Watch For (Windows):**

You should see these messages during build:
```
🎨 ========================================
🎨 EMBEDDING ICON INTO EXE
🎨 ========================================
📄 EXE: C:\path\to\YourApp.exe
🖼️  Icon: C:\path\to\icon.ico
🔧 rcedit: C:\path\to\rcedit.exe

✅ ========================================
✅ ICON EMBEDDED SUCCESSFULLY!
✅ ========================================
```

**If you DON'T see these messages:**
- ❌ afterPack hook is not running
- ❌ Check both package.json and electron-builder.yml
- ❌ Verify afterPack path is correct
- ❌ Make sure you're building for Windows (`--win`)

---

## Troubleshooting

### Icon Not Showing After Build

**1. Check if icon was embedded:**

Windows PowerShell:
```powershell
$exe = Get-Item "dist-electron\win-unpacked\YourApp.exe"
$exe.VersionInfo | Format-List
```

Look for CompanyName, ProductName, FileDescription - if they match what you set, the hook ran.

**2. Check afterPack hook ran:**

Look for the emoji messages in build output. If missing:
- Verify `afterPack` is in your config
- Check script path is correct: `scripts/afterPack.cjs`
- Ensure rcedit is installed: `npm list rcedit`

**3. Manual test:**

Try manually embedding:
```bash
node_modules/rcedit/bin/rcedit.exe "dist-electron/win-unpacked/YourApp.exe" --set-icon "build/icon.ico"
```

If this works but the hook doesn't, the hook isn't being called by electron-builder.

### "rcedit not found" Error

```bash
npm install --save-dev rcedit@latest
```

Make sure it's in `devDependencies` in package.json, not just installed globally.

### Icon Shows in Installer But Not After Installation

**Windows:** Clear icon cache:
```
C:\Windows\System32\ie4uinit.exe -show
```

Or reboot Windows.

**Cause:** Windows caches icons aggressively. Changes may not appear until cache is cleared.

### Icon File Invalid

Verify .ico format:
```javascript
// Check with Node.js
const fs = require('fs');
const buffer = fs.readFileSync('build/icon.ico');
console.log('First 6 bytes:', buffer.slice(0, 6).toString('hex'));
// Should be: 000001000400 (or similar)
// 0000 = reserved
// 0100 = type (.ico)
// 0400 = image count (4 images)
```

### electron-builder Ignoring afterPack

**Symptom:** Hook script never runs, no emoji messages

**Fix:**
1. Make sure `afterPack` is in the SAME config file electron-builder is reading
2. If using package.json `"build": {}`, put afterPack there
3. If using electron-builder.yml, put afterPack there
4. **Better:** put it in BOTH to be safe

### Different Icon in Dev vs. Production

**Dev:** Uses icon from `build/` folder

**Production:** Uses icon embedded in exe by afterPack hook

Make sure both point to the same icon file!

---

## Verification

### Windows

**Desktop Shortcut:**
1. Install your app
2. Check desktop for shortcut
3. Icon should be your custom icon, not Electron logo

**Taskbar:**
1. Launch your app
2. Check Windows taskbar
3. Running app should show your icon

**Start Menu:**
1. Open Start Menu
2. Find your app
3. Should show your custom icon

**Exe Properties:**
1. Right-click installed exe (usually in `C:\Program Files\YourApp\`)
2. Properties > Should show your icon at top
3. Details tab > Should show CompanyName, ProductName, etc.

### macOS

**Dock:**
1. Launch app
2. Check dock icon
3. Should be your custom icon

**Applications Folder:**
1. Open Applications
2. Find your app
3. App bundle should show your icon

### Linux

**Applications Menu:**
1. Open applications menu (depends on DE)
2. Find your app
3. Should show your custom icon

---

## Platform-Specific Notes

### Windows

- **Icon cache:** Windows caches icons aggressively. Clear with `ie4uinit.exe -show` or reboot
- **Code signing:** Unsigned apps may show security warnings, but icon still works
- **Multiple sizes:** .ico file should contain multiple sizes for different contexts
- **Taskbar pinning:** Pinned taskbar apps may need icon cache clear to update

### macOS

- **Retina displays:** Use 1024x1024 icon for best quality
- **ICNS format:** Preferred over PNG for proper sizing on all screen densities
- **Gatekeeper:** Unsigned apps will show security warning (unrelated to icon)
- **notarization:** For production, notarize your app (separate from icon)

### Linux

- **Desktop environments:** Different DEs may handle icons differently (GNOME, KDE, XFCE)
- **Icon theme:** Some themes may override app icons
- **Size:** 512x512 PNG is universally supported
- **Transparency:** Alpha channel recommended for modern look

---

## Best Practices

### 1. Keep Icons in Version Control
```
build/icon.ico
build/icon.icns
build/icon.png
```

### 2. Automate Icon Generation

Create a script to generate all formats from one source:
```bash
# Example: generate-icons.sh
convert source-icon-1024.png -resize 256x256 build/icon.png
convert source-icon-1024.png -define icon:auto-resize=256,128,64,48,32,16 build/icon.ico
# macOS .icns generation (macOS only)
```

### 3. Test on Clean Installs

Test your installer on a clean VM to ensure icons appear correctly for new users.

### 4. Document Your Build Process

Add to your README:
```markdown
## Building

npm run electron:build:win

You should see "✅ ICON EMBEDDED SUCCESSFULLY!" in the build output.
```

### 5. Version Your Icons

When changing icons, update version number to force installer to update icon cache.

---

## Common Mistakes to Avoid

❌ **PNG renamed to .ico** - Won't work! Use proper ICO converter

❌ **afterPack only in electron-builder.yml** - May be ignored if electron-builder reads package.json

❌ **rcedit not installed** - Hook will fail silently or with error

❌ **Wrong icon path** - Use forward slashes or path.join()

❌ **Forgetting to rebuild** - Icon changes require full rebuild

❌ **Testing on dev build** - Icon embedding only happens on production builds

❌ **Not clearing Windows icon cache** - Old icons may persist

---

## Resources

**Tools:**
- rcedit: https://github.com/electron/rcedit
- electron-builder: https://www.electron.build/
- ICO converter: https://icoconvert.com/

**Documentation:**
- Electron Icon Docs: https://www.electronjs.org/docs/latest/tutorial/icons
- electron-builder Icons: https://www.electron.build/icons

**Testing:**
- Windows Icon Viewer: Built into Windows Explorer (file properties)
- macOS Icon Viewer: Quick Look or Finder preview

---

## Success Checklist

Before considering icon embedding complete:

- [ ] Icon files created in correct formats (.ico, .icns, .png)
- [ ] Files placed in `build/` directory
- [ ] electron-builder configured with icon paths
- [ ] afterPack hook created in `scripts/afterPack.cjs`
- [ ] afterPack referenced in electron-builder config
- [ ] rcedit installed in devDependencies
- [ ] electron-builder installed in devDependencies
- [ ] Build shows "✅ ICON EMBEDDED SUCCESSFULLY!" message
- [ ] Tested installer on clean machine
- [ ] Desktop shortcut shows correct icon
- [ ] Taskbar/dock shows correct icon
- [ ] Start Menu/Applications shows correct icon
- [ ] Exe properties show correct metadata

---

## Pro Tips

💡 **Use emoji in afterPack messages** - Makes it easy to spot success/failure in build logs

💡 **Log all paths** - Helps debug path issues across different environments

💡 **Test both dev and production** - Dev may work while production fails (or vice versa)

💡 **Keep backups of working icons** - Icon corruption can be hard to debug

💡 **Document exact icon specs** - Save time when updating icons later

---

## Conclusion

Icon embedding in Electron is straightforward once you understand:
1. **Correct file formats** for each platform
2. **afterPack hook** for Windows (critical!)
3. **Proper dependencies** (electron-builder + rcedit)
4. **Configuration in the right place** (package.json or electron-builder.yml)

The key insight: **electron-builder's built-in icon handling is unreliable on Windows**. The afterPack hook with rcedit gives you full control and visibility into the embedding process.

Follow this guide and you'll see:
```
✅ ICON EMBEDDED SUCCESSFULLY!
```

Every. Single. Build. 🎉

---

**Last Updated:** March 17, 2026  
**Based On:** TrafficJamz Electron icon implementation  
**Status:** Battle-tested and working in production
