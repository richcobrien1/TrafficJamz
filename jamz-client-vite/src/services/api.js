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
// Simplified approach: Use VITE_API_BASE directly without complex detection
// In production (Vercel): VITE_API_BASE points to full backend URL
// In development: VITE_API_BASE is relative '/api' for Vite proxy
// In Capacitor: VITE_API_BASE should be set to full backend URL in native builds

const getBaseURL = () => {
  // Check if running in Electron desktop app
  const isElectron = typeof window !== 'undefined' && 
                     (window.electron !== undefined || window.electronAPI !== undefined);
  
  // Check if running in Capacitor native app - multiple detection methods
  const isCapacitorProtocol = window.location && (
    window.location.protocol === 'capacitor:' || 
    window.location.protocol === 'ionic:' ||
    window.location.protocol === 'file:'
  );
  
  // Check for Capacitor global object (more reliable)
  const hasCapacitorGlobal = typeof window !== 'undefined' && 
                            window.Capacitor !== undefined;
  
  // Android emulator detection
  const isAndroidEmulator = window.location?.hostname === '10.0.2.2' || 
                           (window.location?.hostname === 'localhost' && hasCapacitorGlobal && !isElectron);
  
  const isCapacitor = (hasCapacitorGlobal || isCapacitorProtocol || isAndroidEmulator) && !isElectron;
  
  // Electron also needs production backend (treat like Capacitor for API purposes)
  const needsProductionBackend = isCapacitor || isElectron;
  
  // For local development (localhost:5173, localhost:5174, etc), use '/api' for Vite proxy
  // But NOT if it's Capacitor or Electron (they need production backend)
  const isLocalDev = (window.location?.hostname === 'localhost' || 
                     window.location?.hostname === '127.0.0.1') && !needsProductionBackend;
  
  // Priority: 
  // 1. If Capacitor mobile app OR Electron desktop app, ALWAYS use full backend URL + /api
  // 2. If VITE_API_BASE is explicitly set, use it (production web)
  // 3. If localhost (non-Capacitor/non-Electron), use '/api' for Vite proxy (local dev)
  // 4. Fallback to '/api'
  let apiBase;
  if (needsProductionBackend) {
    // Mobile app OR Desktop app - ALWAYS use full backend URL from environment variable
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://trafficjamz.v2u.us';
    apiBase = `${backendUrl}/api`;
    const appType = isElectron ? 'ELECTRON DESKTOP' : 'CAPACITOR MOBILE';
    console.warn(`📱 ${appType} DETECTED - Using production backend:`, apiBase);
  } else if (import.meta.env.VITE_API_BASE && !isLocalDev) {
    apiBase = import.meta.env.VITE_API_BASE;
  } else if (isLocalDev) {
    apiBase = '/api';
  } else {
    apiBase = import.meta.env.VITE_API_BASE || '/api';
  }
  
  // Enhanced debug logging
  console.log('🔗 API Configuration:', {
    protocol: window.location?.protocol,
    hostname: window.location?.hostname,
    isElectron,
    hasCapacitorGlobal,
    isCapacitorProtocol,
    isAndroidEmulator,
    isCapacitor,
    needsProductionBackend,
    isLocalDev,
    VITE_API_BASE: import.meta.env.VITE_API_BASE,
    computed_baseURL: apiBase,
    mode: import.meta.env.MODE
  });
  
  return apiBase;
};

const normalizedBase = getBaseURL();

// Normalize baseURL: remove trailing slash
const finalBase = normalizedBase.endsWith('/') ? normalizedBase.slice(0, -1) : normalizedBase;

console.log('  finalBase:', finalBase);

const api = axios.create({
  baseURL: finalBase,
  timeout: 90000, // 90 second timeout to handle Render cold starts (free tier sleeps after inactivity)
  headers: {
    'Content-Type': 'application/json'
  }
});

// Simplified request interceptor - remove complex URL normalization
api.interceptors.request.use((config) => {
  try {
    // Always log the request for debugging (especially important for mobile)
    console.log('📤 API Request:', {
      method: config.method?.toUpperCase(),
      baseURL: config.baseURL,
      url: config.url,
      fullURL: `${config.baseURL}${config.url}`,
      hasAuth: !!config.headers.Authorization,
      mode: import.meta.env.MODE,
      platform: window.Capacitor ? 'MOBILE' : 'WEB'
    });
    return config;
  } catch (err) {
    console.error('❌ Request interceptor error:', err);
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
  (response) => {
    // Log successful responses for debugging
    console.log('✅ API Response:', {
      status: response.status,
      url: response.config.url,
      hasData: !!response.data
    });
    return response;
  },
  async (error) => {
    // Enhanced error logging for mobile debugging
    console.error('❌ API Error:', {
      message: error.message,
      status: error.response?.status,
      url: error.config?.url,
      baseURL: error.config?.baseURL,
      fullURL: error.config?.baseURL + error.config?.url,
      code: error.code,
      isNetworkError: !error.response,
      platform: window.Capacitor ? 'MOBILE' : 'WEB'
    });
    
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
