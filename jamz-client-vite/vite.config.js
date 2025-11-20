// vite.config.js

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

export default defineConfig({
  base: './', // Use relative paths for Electron
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
    // NOTE: avoid hard-coded network IPs here so HTTPS origins don't end up calling
    // an insecure backend address and trigger Mixed Content blocking.
    proxy: (() => {
      const backendTarget = process.env.VITE_BACKEND_URL || 'http://localhost:5000';
      console.log('Vite dev proxy target set to:', backendTarget);
      return {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
          ws: true,
          // Increase proxy timeout for slow backends
          proxyTimeout: 15000,
          // Log proxy errors and return a JSON 502 so the SPA fallback isn't sent
          onError: (err, req, res) => {
            try {
              console.error('Vite proxy error for', req.url, '->', backendTarget, err && err.stack);
              if (!res.headersSent) {
                res.writeHead(502, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'proxy_error', message: err && err.message }));
              }
            } catch (e) {
              console.error('Failed to write proxy error response:', e && e.stack);
            }
          },
          onProxyReq: (proxyReq, req, res) => {
            console.log('Vite proxy req ->', req.method, req.url, 'to', backendTarget);
          },
          onProxyRes: (proxyRes, req, res) => {
            console.log('Vite proxy res <-', req.method, req.url, 'status', proxyRes && proxyRes.statusCode);
          }
        },
        // Proxy socket.io connections to the backend so the client can use
        // the dev server origin for socket.io without attempting to talk to
        // Vite's own websocket endpoint.
        '/socket.io': {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
          ws: true,
          proxyTimeout: 15000,
          onError: (err, req, res) => {
            try {
              console.error('Vite socket proxy error for', req.url, '->', backendTarget, err && err.stack);
              if (!res.headersSent) {
                res.writeHead(502, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'proxy_error', message: err && err.message }));
              }
            } catch (e) {
              console.error('Failed to write socket proxy error response:', e && e.stack);
            }
          },
          onProxyReq: (proxyReq, req, res) => {
            console.log('Vite socket proxy req ->', req.method, req.url, 'to', backendTarget);
          },
          onProxyRes: (proxyRes, req, res) => {
            console.log('Vite socket proxy res <-', req.method, req.url, 'status', proxyRes && proxyRes.statusCode);
          }
        }
      };
    })()
  },

  // Optional HTTPS support for dev (useful for iOS getUserMedia / mic testing)
  // To enable: set environment variable VITE_HTTPS=true and optionally
  // VITE_HTTPS_CERT and VITE_HTTPS_KEY to point to certificate files.
  // By default this will look for certs in the project `certs/` folder.
  // Example: VITE_HTTPS=true VITE_HTTPS_CERT=../certs/fullchain.pem VITE_HTTPS_KEY=../certs/privkey.pem npm run dev
  ...(process.env.VITE_HTTPS === 'true'
    ? (() => {
        // Resolve defaults to project-level certs
        const defaultCert = path.resolve(__dirname, '..', 'certs', 'fullchain.pem');
        const defaultKey = path.resolve(__dirname, '..', 'certs', 'privkey.pem');
        const certPath = process.env.VITE_HTTPS_CERT || defaultCert;
        const keyPath = process.env.VITE_HTTPS_KEY || defaultKey;

        let httpsConfig = {};
        try {
          httpsConfig = {
            cert: fs.readFileSync(certPath, 'utf8'),
            key: fs.readFileSync(keyPath, 'utf8')
          };
          console.log('Vite HTTPS enabled using cert:', certPath, 'key:', keyPath);
        } catch (err) {
          console.warn('Failed to read HTTPS cert/key for Vite dev server:', err.message);
          console.warn('Falling back to HTTP. Set VITE_HTTPS_CERT and VITE_HTTPS_KEY to valid files.');
          return {};
        }

        return { server: { https: httpsConfig } };
      })()
    : {}),
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
