// jamz-client-vite/src/utils/clerkBackendSync.js
// Bridges Clerk authentication with backend JWT system

import axios from 'axios';

const getBackendURL = () => {
  const isLocalDev = window.location?.hostname === 'localhost' || 
                     window.location?.hostname === '127.0.0.1';
  
  if (isLocalDev) {
    return '/api'; // Vite proxy in development
  }
  
  return import.meta.env.VITE_BACKEND_URL 
    ? `${import.meta.env.VITE_BACKEND_URL}/api`
    : 'https://trafficjamz.v2u.us/api';
};

/**
 * Syncs Clerk user session with backend JWT authentication
 * Creates/logs in user on backend and stores JWT tokens in localStorage
 * 
 * @param {Object} clerkUser - Clerk user object from useUser() hook
 * @returns {Promise<boolean>} - true if sync successful, false otherwise
 */
export async function syncClerkWithBackend(clerkUser) {
  if (!clerkUser) {
    console.warn('⚠️ No Clerk user provided for backend sync');
    return false;
  }

  try {
    const backendURL = getBackendURL();
    console.log('🔄 Syncing Clerk user with backend...', {
      clerkUserId: clerkUser.id,
      email: clerkUser.primaryEmailAddress?.emailAddress,
      backendURL
    });

    // Use Clerk's email and username to create/login on backend
    const email = clerkUser.primaryEmailAddress?.emailAddress;
    const username = clerkUser.username || email?.split('@')[0] || `user_${clerkUser.id.slice(-8)}`;
    const fullName = clerkUser.fullName || username;

    // Try to login first (if user exists)
    try {
      const loginResponse = await axios.post(`${backendURL}/auth/clerk-sync`, {
        clerkUserId: clerkUser.id,
        email,
        username,
        fullName
      }, {
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' }
      });

      if (loginResponse.data.token && loginResponse.data.refreshToken) {
        localStorage.setItem('token', loginResponse.data.token);
        localStorage.setItem('refresh_token', loginResponse.data.refreshToken);
        console.log('✅ Backend JWT tokens stored successfully');
        return true;
      }
    } catch (syncError) {
      // If clerk-sync endpoint doesn't exist (404), fall back to register
      if (syncError.response?.status === 404) {
        console.log('📝 Backend clerk-sync endpoint not found, attempting register...');
        
        const registerResponse = await axios.post(`${backendURL}/auth/register`, {
          email,
          username,
          password: `clerk_${clerkUser.id}`, // Dummy password since Clerk handles auth
          fullName
        }, {
          timeout: 10000,
          headers: { 'Content-Type': 'application/json' }
        });

        if (registerResponse.data.token && registerResponse.data.refreshToken) {
          localStorage.setItem('token', registerResponse.data.token);
          localStorage.setItem('refresh_token', registerResponse.data.refreshToken);
          console.log('✅ User registered on backend, JWT tokens stored');
          return true;
        }
      } else if (syncError.response?.status === 409) {
        // User exists, try login
        console.log('📝 User exists, attempting login...');
        
        const loginResponse = await axios.post(`${backendURL}/auth/login`, {
          email,
          password: `clerk_${clerkUser.id}`
        }, {
          timeout: 10000,
          headers: { 'Content-Type': 'application/json' }
        });

        if (loginResponse.data.token && loginResponse.data.refreshToken) {
          localStorage.setItem('token', loginResponse.data.token);
          localStorage.setItem('refresh_token', loginResponse.data.refreshToken);
          console.log('✅ Backend login successful, JWT tokens stored');
          return true;
        }
      } else {
        throw syncError;
      }
    }

    console.error('❌ Failed to obtain backend tokens');
    return false;

  } catch (error) {
    console.error('❌ Clerk-Backend sync failed:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    return false;
  }
}

/**
 * Clears backend JWT tokens from localStorage
 */
export function clearBackendTokens() {
  localStorage.removeItem('token');
  localStorage.removeItem('refresh_token');
  console.log('🧹 Backend tokens cleared');
}
