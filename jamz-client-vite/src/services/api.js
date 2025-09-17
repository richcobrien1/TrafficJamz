// File: jamz-client-vite/src/services/api.js
// Purpose: Centralized Axios client for TrafficJamz frontend
// Usage:
//   - Reads base URL from VITE_API_BASE (set in .env files)
//     • In production: VITE_API_BASE=/api   (nginx proxies /api → backend)
//     • In development: VITE_API_BASE=http://localhost:5000/api
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
const rawBase = import.meta.env.VITE_API_BASE || '';

// Normalize baseURL: remove trailing slash
const normalizedBase = rawBase.endsWith('/') ? rawBase.slice(0, -1) : rawBase;

const api = axios.create({
  baseURL: normalizedBase, // must be defined in .env
});

// Normalize request URL to avoid double '/api' when callers include it
api.interceptors.request.use((config) => {
  try {
    if (!config || !config.url) return config;
    // If the request URL is absolute (starts with scheme or //), don't modify it
    const isAbsolute = /^([a-zA-Z][a-zA-Z0-9+.-]*:)?\/\//.test(config.url) || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(config.url);
    if (isAbsolute) return config;

    // Ensure a single leading slash for relative URLs
    config.url = config.url.replace(/^\/+/, '/');

    const baseHasApi = (api.defaults.baseURL || '').replace(/\/$/, '').endsWith('/api');

    if (baseHasApi) {
      // Strip any number of leading '/api' segments from the caller's URL so that
      // baseURL '/api' + caller '/api/auth' => final '/api/auth' (no double-prefix).
      // Examples:
      //  - '/api/api/auth' -> '/auth'
      //  - '/api/auth' -> '/auth'
      //  - '/api' -> '/'
      while (config.url.startsWith('/api/')) {
        config.url = config.url.replace(/^\/api/, '');
      }
      if (config.url === '/api') config.url = '/';
      if (!config.url.startsWith('/')) config.url = '/' + config.url;
    } else {
      // Normalize duplicate slashes for non-api-base cases
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
    // Support both 'token' and 'access_token' keys
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      if (import.meta.env.MODE === 'development') {
        // Only log in development to avoid noisy console output in production
        console.debug('Token attached to request headers');
      }
    }
    return config;
  },
  (error) => {
    if (import.meta.env.MODE === 'development') console.error('Request interceptor error:', error);
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
