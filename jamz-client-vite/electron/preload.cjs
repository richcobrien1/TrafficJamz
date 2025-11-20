const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  platform: () => ipcRenderer.invoke('get-platform'),
  appVersion: () => ipcRenderer.invoke('get-app-version'),
  isElectron: true
});

// Expose environment info
contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  }
});

console.log('🔌 Electron preload script loaded');
