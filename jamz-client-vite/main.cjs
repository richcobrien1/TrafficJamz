const { app, BrowserWindow, Tray, Menu, ipcMain, shell, nativeImage } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development' || process.env.ELECTRON_START_URL;

let mainWindow;
let tray;

function createWindow() {
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
    // Production mode - use loadFile per Electron docs
    const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
    
    console.log('📂 App path:', app.getAppPath());
    console.log('📂 __dirname:', __dirname);
    console.log('📂 Loading file:', indexPath);
    
    // Use loadFile() as recommended by Electron docs for local files
    mainWindow.loadFile(indexPath)
      .then(() => {
        console.log('✅ File loaded successfully');
      })
      .catch((err) => {
        console.error('❌ Failed to load file:', err);
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

  // Show window when ready - Electron best practice to avoid visual flash
  mainWindow.once('ready-to-show', () => {
    console.log('🎬 Window ready to show');
    mainWindow.show();
    mainWindow.focus();
    
    // Only open DevTools in development
    if (isDev) {
      mainWindow.webContents.openDevTools();
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
