// File: jamz-client-vite/src/main.jsx
// Purpose: Entry point for the TrafficJamz frontend application
// Usage:
//   - Mounts the React app into the DOM
//   - Wraps <App /> with BrowserRouter for client-side routing
//   - Provides React.StrictMode for highlighting potential issues
//
// Notes:
//   - BrowserRouter is required so routes like /auth/login resolve correctly
//   - Nginx must be configured with SPA fallback (try_files) for direct URL access
//   - basename is only needed if deploying under a sub-path (e.g., /app)

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import './index.css';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import pLog from './utils/persistentLogger';

// Display startup banner
console.log('%c📜 JAMZ DIAGNOSTIC MODE', 'background: #2196F3; color: white; font-size: 16px; padding: 8px; font-weight: bold;');
console.log('%cLogs preserved across reloads!', 'color: #4CAF50; font-size: 14px; font-weight: bold;');
console.log('%cView logs: %cwindow.viewLogs()', 'color: #666; font-size: 12px;', 'color: #FF9800; font-weight: bold; font-family: monospace;');
console.log('%cClear logs: %cwindow.clearLogs()', 'color: #666; font-size: 12px;', 'color: #FF9800; font-weight: bold; font-family: monospace;');
console.log('─'.repeat(50));

pLog.log('🚀 Application starting...', { url: window.location.href });

// Global error handler for chunk loading errors
window.addEventListener('error', (event) => {
  const isChunkError = 
    event.message?.includes('Failed to fetch dynamically imported module') ||
    event.message?.includes('Loading chunk') ||
    event.filename?.includes('.js');
  
  if (isChunkError) {
    console.warn('🔄 Chunk loading error detected globally - clearing caches and reloading');
    event.preventDefault();
    
    // Clear all caches
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
      });
    }
    
    // Reload after clearing caches
    setTimeout(() => {
      window.location.reload();
    }, 500);
  }
});

// Use HashRouter in Electron (file:// protocol), BrowserRouter for web
// Check for both window.electron and window.electronAPI, plus file:// protocol
const isElectron = window.electron || window.electronAPI || window.location.protocol === 'file:';
const Router = isElectron ? HashRouter : BrowserRouter;

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <ErrorBoundary>
    <Router>
      <App />
    </Router>
  </ErrorBoundary>
);
