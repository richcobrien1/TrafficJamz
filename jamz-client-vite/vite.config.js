// vite.config.js

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Listen on all interfaces for mobile access
    port: 5174, // Run on port 5174
    middlewareMode: false,
    fs: {
      strict: false,
    },
    hmr: {
      overlay: true,
    },
    // Proxy API calls to the backend (useful when running the client via Vite locally)
    // Set VITE_BACKEND_URL in your environment to override the default target.
    proxy: {
      '/api': {
        // Use network IP for mobile testing, fallback to localhost for local development
        target: process.env.VITE_BACKEND_URL || 'http://192.178.58.146:5000' || 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        ws: true
      }
      ,
      // Proxy socket.io connections to the backend so the client can use
      // the dev server origin for socket.io without attempting to talk to
      // Vite's own websocket endpoint.
      '/socket.io': {
        target: process.env.VITE_BACKEND_URL || 'http://192.178.58.146:5000' || 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        ws: true
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
  },
  logLevel: 'info',
});
