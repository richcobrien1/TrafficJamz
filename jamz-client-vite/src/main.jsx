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

// Use HashRouter in Electron (file:// protocol), BrowserRouter for web
const Router = window.electron ? HashRouter : BrowserRouter;

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <Router>
        <App />
      </Router>
    </ErrorBoundary>
  </React.StrictMode>
);
