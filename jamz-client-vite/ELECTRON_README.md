# TrafficJamz Desktop (Electron)

## Desktop App Features

The Electron desktop app provides native Windows, macOS, and Linux support with enhanced features:

### Desktop-Specific Features
- 🪟 **Native Window**: Dedicated application window (not browser tab)
- 🔔 **System Notifications**: Native OS notifications
- 📌 **System Tray**: Minimize to tray, quick access menu
- 🚀 **Auto-Start**: Optional launch on system startup
- 🔗 **Deep Linking**: `trafficjamz://` protocol support
- ⌨️ **Media Keys**: Keyboard play/pause/skip integration
- 💾 **Better Performance**: Dedicated resources, no browser overhead

## Development

### Run in Development Mode
```bash
npm run electron:dev
```
This will:
1. Start Vite dev server on port 5174
2. Wait for server to be ready
3. Launch Electron with hot reload

### Build for Distribution

**Windows:**
```bash
npm run electron:build:win
```
Output: `dist-electron/TrafficJamz-Setup-1.0.0.exe`

**macOS (requires Mac):**
```bash
npm run electron:build:mac
```
Output: `dist-electron/TrafficJamz-1.0.0.dmg`

**Linux:**
```bash
npm run electron:build:linux
```
Output: `dist-electron/TrafficJamz-1.0.0.AppImage`

**All platforms:**
```bash
npm run electron:build
```

## Architecture

```
jamz-client-vite/
├── electron/
│   ├── main.js          # Main process (Node.js)
│   └── preload.js       # Preload script (bridge)
├── src/                 # React app (same as web)
├── dist/                # Built web app
└── dist-electron/       # Built desktop apps
```

### Main Process (main.js)
- Creates application window
- Manages system tray
- Handles native OS features
- IPC communication with renderer

### Preload Script (preload.js)
- Secure bridge between main and renderer
- Exposes safe APIs to React app
- Context isolation for security

### Renderer Process
- Your React/Vite app runs here
- Same codebase as web version
- Can detect Electron via `window.electronAPI`

## Platform Detection

In your React code:
```javascript
if (window.electronAPI?.isElectron) {
  console.log('Running in Electron desktop app');
  console.log('Platform:', window.electronAPI.platform); // 'win32', 'darwin', 'linux'
}
```

## Icon Requirements

For best results, provide icons:
- **Windows**: `.ico` file (256x256)
- **macOS**: `.icns` file (1024x1024)
- **Linux**: `.png` file (512x512)

Place in `build/` directory:
```
build/
├── icon.ico
├── icon.icns
└── icon.png
```

## Distribution

### Windows
- **NSIS Installer**: Standard Windows setup with install wizard
- **Portable**: Single .exe, no installation required

### macOS
- **DMG**: Drag-to-Applications installer
- **ZIP**: Compressed app bundle

### Linux
- **AppImage**: Universal Linux package (run anywhere)
- **DEB**: Debian/Ubuntu package

## Auto-Updates (Optional)

Configure auto-updates in `package.json`:
```json
"build": {
  "publish": {
    "provider": "github",
    "owner": "richcobrien1",
    "repo": "TrafficJamz"
  }
}
```

## Troubleshooting

### Electron won't start
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Build fails
```bash
# Make sure you've built the web app first
npm run build
# Then build Electron
npm run electron:build:win
```

### Dev tools not showing
Add `?` to force dev tools in development:
```javascript
// electron/main.js
mainWindow.webContents.openDevTools();
```

## Performance Tips

1. **Preload Images**: Use Electron's session to cache
2. **Background Tasks**: Move heavy work to main process
3. **Native Modules**: Use Node.js for file operations
4. **Window State**: Save/restore window size and position

## Security

- ✅ Context isolation enabled
- ✅ Node integration disabled
- ✅ Remote module disabled
- ✅ Web security enabled
- ✅ Preload script for safe IPC

## Next Steps

1. Create proper app icons
2. Add system tray menu items
3. Implement auto-updater
4. Add desktop notifications for proximity alerts
5. Media key integration for music controls
6. Windows installer customization
