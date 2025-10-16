// File: jamz-client-vite/src/services/api.js
// Purpose: Centralized Axios client for TrafficJamz frontend
// Usage:
//   - Reads base URL from VITE_API_BASE (set in .env files)
//     • In production: VITE_API_BASE=/api   (nginx proxies /api → backend)
//     • In mobile/Capacitor: Detects mobile context and uses full backend URL
//   - Attaches JWT access token from localStorage to every request
//   - Handles 401 responses by attempting refresh with stored refresh_token
//   - Provides a single Axios instance for all API calls
//
// Notes:
//   - Avoids double-prefixing `/api/api` by never hardcoding `/api` in code
//   - Always use `api.get('/auth/login')` etc. — the baseURL handles the prefix
//   - Refresh logic uses the same Axios instance to respect baseURL

import axios from 'axios';

// 🔗 Create axios instance with base API URL
// Default to a relative '/api' so the browser calls the current origin
// and the Vite dev server (or production server) can proxy to the backend.
// If you need to point directly at a backend during mobile testing, set
// VITE_BACKEND_URL (e.g. http://192.168.1.10:5000) and the client will
// use that as the absolute backend base.
const rawBase = import.meta.env.VITE_API_BASE || '/api';

// Detect if running in Capacitor/mobile context
const isMobile = () => {
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  const userAgent = navigator.userAgent;
  
  // Check for Capacitor protocol
  const isCapacitor = protocol === 'capacitor:';
  
  // Check for mobile user agent
  const isMobileUA = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  
  // Check if running on non-localhost (network IP)
  const isNetworkHost = hostname !== 'localhost' && hostname !== '127.0.0.1' && !hostname.startsWith('192.168.') && !hostname.startsWith('10.') && !hostname.startsWith('172.');
  
  const result = isCapacitor || (protocol === 'http:' && isNetworkHost) || (protocol === 'https:' && isNetworkHost);
  
  console.log('📱 Mobile detection:', {
    protocol,
    hostname,
    isCapacitor,
    isMobileUA,
    isNetworkHost,
    result
  });
  
  return result;
};

// For mobile apps, use the full backend URL instead of relative path
const getBaseURL = () => {
  // Safer default: in browser contexts prefer a relative '/api' so the
  // dev server or production host can proxy/forward to the backend and
  // avoid mixed-content or CORS issues. Only use an explicit backend URL
  // when running in a native environment (Capacitor) or when explicitly
  // forced via VITE_BACKEND_FORCE=true.
  const explicitBackend = import.meta.env.VITE_BACKEND_URL;
  const forceBackend = import.meta.env.VITE_BACKEND_FORCE === 'true';
  const isCapacitor = window.location && window.location.protocol === 'capacitor:';
  const isBrowserHttp = window.location && (window.location.protocol === 'http:' || window.location.protocol === 'https:');

  if (explicitBackend && (isCapacitor || forceBackend || !isBrowserHttp)) {
    // Ensure we don't double the '/api' portion
    if (rawBase.startsWith('/')) {
      return explicitBackend.replace(/\/$/,'') + rawBase;
    }
    return explicitBackend.replace(/\/$/,'') + '/' + rawBase.replace(/^\//, '');
  }

  // Default: use relative path so browser calls the same origin
  return rawBase;
};

const normalizedBase = getBaseURL();

// Debug logging
console.log('🔧 API Configuration:');
console.log('  VITE_API_BASE:', import.meta.env.VITE_API_BASE);
console.log('  rawBase:', rawBase);
console.log('  isMobile:', isMobile());
console.log('  normalizedBase:', normalizedBase);
console.log('  All env vars:', Object.keys(import.meta.env).filter(key => key.startsWith('VITE_')));

// Normalize baseURL: remove trailing slash
const finalBase = normalizedBase.endsWith('/') ? normalizedBase.slice(0, -1) : normalizedBase;

console.log('  finalBase:', finalBase);

const api = axios.create({
  baseURL: finalBase, // must be defined in .env
});

// Normalize request URL to avoid double '/api' when callers include it
api.interceptors.request.use((config) => {
  try {
    // If the caller provided an absolute URL (starts with http/https),
    // axios will normally use it as-is. However, in some runtimes there
    // have been cases where baseURL was mistakenly concatenated with an
    // absolute url (resulting in 'http://host/http://host/...'). To be
    // defensive, if we detect an absolute URL, clear the baseURL for
    // this request so axios sends the absolute URL unchanged.
    if (config && config.url && /^https?:\/\//i.test(config.url)) {
      // Clear any default baseURL for this request
      config.baseURL = '';
      if (import.meta.env.MODE === 'development') {
        console.log('api.request interceptor: detected absolute URL, sending as-is:', config.url);
      }
      return config;
    }

    if (!config || !config.url) return config;

    const baseHasApi = (api.defaults.baseURL || '').replace(/\/$/, '').endsWith('/api');

    // If baseURL ends with '/api' and caller also prefixed '/api', strip the extra '/api'
    if (baseHasApi) {
      // Remove leading double-slashes and normalize
      config.url = config.url.replace(/^\/+/, '/');

      // Collapse sequences like '/api/api' -> '/api' and '/api/api/auth' -> '/api/auth'
      config.url = config.url.replace(/\/api(\/api)+/g, '/api');

      // If caller included '/api' at the start, strip the redundant leading '/api'
      if (config.url.startsWith('/api/')) {
        config.url = config.url.replace(/^\/api/, '');
        if (!config.url.startsWith('/')) config.url = '/' + config.url;
      } else if (config.url === '/api') {
        // convert '/api' -> '/'
        config.url = '/';
      }
    } else {
      // Ensure no accidental double slashes when baseURL doesn't end with '/'
      // Also collapse repeated slashes in the caller URL
      config.url = config.url.replace(/\/+/g, '/');
    }

    return config;
  } catch (err) {
    // If normalization fails, proceed with original config
    return config;
  }
});

// 🔐 Request interceptor to attach token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('✅ Token attached to request headers');
    } else {
      console.warn('⚠️ No token found for API request');
    }
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// 🔁 Token refresh support
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// 🧠 Response interceptor with refresh logic
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry
    ) {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        console.warn('⚠️ No refresh token found. Redirecting to login.');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // ✅ Use the same api instance so baseURL is respected
        const res = await api.post('/auth/refresh-token', {
          refresh_token: refreshToken,
        });

        const { access_token } = res.data;
        localStorage.setItem('token', access_token);
        console.log('🔁 Token refreshed');

        api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
        processQueue(null, access_token);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        console.error('❌ Token refresh failed. Redirecting to login.');
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;

// Export Mapbox token for client-side use
export const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
