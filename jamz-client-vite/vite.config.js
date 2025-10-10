// vite.config.js

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
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
        // prefer explicit env override, then localhost:5000 (backend server), then host.docker.internal
        target: process.env.VITE_BACKEND_URL || 'http://localhost:5000' || 'http://host.docker.internal:5000',
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
