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
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.jsx';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
