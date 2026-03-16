const { app, BrowserWindow, Tray, Menu, ipcMain, shell, nativeImage, session } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development' || process.env.ELECTRON_START_URL;

let mainWindow;
let tray;

function createWindow() {
  // Configure session to allow Clerk authentication
  const ses = session.defaultSession;
  
  // ⚡ CLEAR ALL CACHE ON STARTUP - ensures desktop app always loads latest version
  console.log('🧹 Clearing Electron cache to ensure fresh app load...');
  ses.clearCache().then(() => {
    console.log('✅ Cache cleared successfully');
  }).catch((err) => {
    console.error('⚠️ Failed to clear cache:', err);
  });
  
  // Also clear storage data (cookies, localStorage, etc.) for fresh start
  ses.clearStorageData({
    storages: ['appcache', 'serviceworkers', 'cachestorage']
  }).then(() => {
    console.log('✅ Storage data cleared');
  }).catch((err) => {
    console.error('⚠️ Failed to clear storage:', err);
  });
  
  // Allow CORS for Clerk domains
  ses.webRequest.onBeforeSendHeaders((details, callback) => {
    callback({ requestHeaders: { ...details.requestHeaders } });
  });
  
  ses.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...details.responseHeaders };
    // Remove restrictive headers that might block Clerk
    delete responseHeaders['x-frame-options'];
    delete responseHeaders['X-Frame-Options'];
    callback({ responseHeaders });
  });
  
  console.log('🔧 Configured session for Clerk authentication');
  
  // Get icon path - use nativeImage for proper Windows icon handling
  let icon;
  if (process.platform === 'win32') {
    const iconPath = isDev 
      ? path.join(__dirname, '..', 'build', 'icon.ico')
      : path.join(process.resourcesPath, 'icon.ico');
    icon = nativeImage.createFromPath(iconPath);
    console.log('🎨 Loading icon from:', iconPath);
    if (icon.isEmpty()) {
      console.warn('⚠️ Icon file not found or invalid');
    }
  } else {
    const iconPath = path.join(__dirname, '..', 'build', 'icon.png');
    icon = nativeImage.createFromPath(iconPath);
  }
  
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    icon: icon,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      webSecurity: false, // Disabled to allow Clerk authentication
      allowRunningInsecureContent: true
    },
    backgroundColor: '#1a1a1a',
    title: 'TrafficJamz',
    show: false // Don't show until ready - per Electron best practices
  });

  // Load the app
  if (process.env.ELECTRON_START_URL) {
    // Development mode - use dev server
    console.log('📡 Loading from dev server:', process.env.ELECTRON_START_URL);
    mainWindow.loadURL(process.env.ELECTRON_START_URL);
  } else {
    // Production mode - MUST load from HTTPS for Clerk to work
    const productionUrl = 'https://jamz.v2u.us';
    console.log('🌐 Loading production web app:', productionUrl);
    console.log('✅ Clerk authentication requires HTTPS - loading from web');
    
    mainWindow.loadURL(productionUrl)
      .then(() => {
        console.log('✅ Production app loaded successfully');
      })
      .catch((err) => {
        console.error('❌ Failed to load production app:', err);
      });
  }

  // Log any load errors
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('❌ Failed to load:', { errorCode, errorDescription, validatedURL });
  });

  // Log successful load
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('✅ Page loaded successfully');
    console.log('📍 Current URL:', mainWindow.webContents.getURL());
  });
  
  // Log console messages from renderer (catch Clerk errors)
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    const logLevels = ['LOG', 'WARN', 'ERROR'];
    console.log(`[Renderer ${logLevels[level]}]`, message);
    
    // Highlight Clerk-related messages
    if (message.includes('Clerk') || message.includes('clerk')) {
      console.log('🔐 CLERK MESSAGE:', message);
    }
  });

  // Show window when ready - Electron best practice to avoid visual flash
  mainWindow.once('ready-to-show', () => {
    console.log('🎬 Window ready to show');
    mainWindow.show();
    mainWindow.focus();
    
    // ALWAYS open DevTools for debugging Clerk loading issues
    mainWindow.webContents.openDevTools();
    console.log('🔧 DevTools opened for debugging');
  });
  
  // ⚡ KEYBOARD SHORTCUTS FOR FORCE RELOAD
  mainWindow.webContents.on('before-input-event', (event, input) => {
    // F5 or Ctrl+R - Normal reload
    if ((input.key === 'F5' || (input.control && input.key === 'r')) && input.type === 'keyDown') {
      console.log('🔄 F5/Ctrl+R pressed - Reloading app...');
      mainWindow.reload();
    }
    
    // Ctrl+Shift+R or Ctrl+F5 - Force reload (clear cache first)
    if (((input.control && input.shift && input.key === 'r') || (input.control && input.key === 'F5')) && input.type === 'keyDown') {
      console.log('🔄 Ctrl+Shift+R pressed - Clearing cache and reloading...');
      session.defaultSession.clearCache().then(() => {
        mainWindow.reload();
      });
    }
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Handle window close - allow normal quit behavior
  mainWindow.on('close', () => {
    // Clean up
    if (mainWindow) {
      mainWindow.webContents.closeDevTools();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    // Quit app when main window closes
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}

function createTray() {
  // Create system tray icon (skip if icon fails to load)
  try {
    // Use nativeImage for proper icon handling
    let trayIcon;
    if (process.platform === 'win32') {
      const trayIconPath = isDev
        ? path.join(__dirname, '..', 'build', 'icon.ico')
        : path.join(process.resourcesPath, 'icon.ico');
      trayIcon = nativeImage.createFromPath(trayIconPath);
    } else {
      const trayIconPath = path.join(__dirname, '..', 'build', 'icon.png');
      trayIcon = nativeImage.createFromPath(trayIconPath);
    }
    
    if (trayIcon.isEmpty()) {
      console.warn('⚠️ Tray icon not found, skipping tray creation');
      return;
    }
    
    tray = new Tray(trayIcon);
    
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show TrafficJamz',
        click: () => {
          mainWindow.show();
        }
      },
      {
        label: 'Quit',
        click: () => {
          app.isQuitting = true;
          app.quit();
        }
      }
    ]);

    tray.setToolTip('TrafficJamz');
    tray.setContextMenu(contextMenu);
    
    tray.on('click', () => {
      mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
    });
  } catch (error) {
    console.warn('⚠️ Could not create system tray:', error.message);
  }
}

// App lifecycle
app.whenReady().then(() => {
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Always quit when all windows are closed (including macOS)
  app.quit();
});

app.on('before-quit', () => {
  // Ensure we can quit even if minimize-to-tray was preventing it
  app.isQuitting = true;
  
  // Force close any remaining windows
  const windows = BrowserWindow.getAllWindows();
  windows.forEach(win => {
    try {
      win.destroy();
    } catch (e) {
      console.error('Error destroying window:', e);
    }
  });
});

// IPC handlers for communication between renderer and main process
ipcMain.handle('get-platform', () => {
  return process.platform;
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

// Handle app protocol for deep linking (trafficjamz://)
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('trafficjamz', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('trafficjamz');
}

// Log ready state
app.on('ready', () => {
  console.log('🚀 TrafficJamz Electron app ready!');
  console.log('📍 Environment:', isDev ? 'Development' : 'Production');
  console.log('📁 App path:', app.getAppPath());
});
