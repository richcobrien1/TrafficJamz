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

// Hide loading fallback once React is ready
setTimeout(() => {
  const fallback = document.getElementById('loading-fallback');
  if (fallback) fallback.style.display = 'none';
}, 100);
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

// Global error handler for chunk loading errors (disabled in Electron)
const isElectronEnv = window.electron || window.electronAPI || window.location.protocol === 'file:';
if (!isElectronEnv) {
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
}

// Use HashRouter ONLY for file:// protocol, BrowserRouter for web (including Electron loading web URLs)
// This prevents routing conflicts when Electron loads https://jamz.v2u.us
const isFileProtocol = window.location.protocol === 'file:';
const Router = isFileProtocol ? HashRouter : BrowserRouter;

// Log router selection for debugging
console.log('🧭 Router selected:', isFileProtocol ? 'HashRouter (file://)' : 'BrowserRouter (https://)', {
  protocol: window.location.protocol,
  href: window.location.href
});

// Clean up hash fragments in Electron when using BrowserRouter to prevent routing conflicts
if (!isFileProtocol && (window.electron || window.electronAPI) && window.location.hash) {
  console.warn('🧹 Cleaning up hash fragment in Electron BrowserRouter:', window.location.hash);
  // Remove hash without triggering a page reload
  history.replaceState(null, '', window.location.pathname + window.location.search);
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <ErrorBoundary>
    <Router>
      <App />
    </Router>
  </ErrorBoundary>
);
