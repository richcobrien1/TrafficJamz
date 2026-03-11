// jamz-client-vite/src/utils/clerkBackendSync.js
// Bridges Clerk authentication with backend JWT system

import axios from 'axios';
import sessionService from '../services/session.service';

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
    
    // Generate a secure dummy password (backend requires 8+ chars)
    const dummyPassword = `Clerk_${clerkUser.id}_Auth2024!`;

    // Check if we already have valid tokens (skip sync if so)
    const existingToken = localStorage.getItem('token');
    if (existingToken) {
      console.log('✅ Backend tokens already exist, skipping sync');
      return true;
    }

    // Try to login first (if user exists)
    try {
      console.log('🌐 Sending clerk-sync request to backend...');
      const loginResponse = await axios.post(`${backendURL}/auth/clerk-sync`, {
        clerkUserId: clerkUser.id,
        email,
        username,
        fullName
      }, {
        timeout: 5000, // Reduced from 10s to 5s
        headers: { 'Content-Type': 'application/json' }
      });
      
      console.log('✅ Clerk-sync response received:', { status: loginResponse.status });

      if (loginResponse.data.access_token && loginResponse.data.refresh_token) {
        localStorage.setItem('token', loginResponse.data.access_token);
        localStorage.setItem('refresh_token', loginResponse.data.refresh_token);
        
        // Cache user data if provided
        if (loginResponse.data.user) {
          sessionService.cacheUserData(loginResponse.data.user);
          console.log('✅ Backend JWT tokens and user data stored successfully');
        } else {
          console.log('✅ Backend JWT tokens stored successfully');
        }
        
        return true;
      }
    } catch (syncError) {
      // Log timeout specifically
      if (syncError.code === 'ECONNABORTED') {
        console.error('❌ Clerk-sync request timed out after 5 seconds');
      } else {
        console.error('❌ Clerk-sync error:', {
          status: syncError.response?.status,
          message: syncError.message,
          code: syncError.code
        });
      }
      
      // If clerk-sync endpoint doesn't exist (404), fall back to register
      if (syncError.response?.status === 404) {
        console.log('📝 Backend clerk-sync endpoint not found, attempting register...');
        
        try {
          const registerResponse = await axios.post(`${backendURL}/auth/register`, {
            email,
            username,
            password: dummyPassword,
            first_name: fullName.split(' ')[0] || username,
            last_name: fullName.split(' ').slice(1).join(' ') || ''
          }, {
            timeout: 10000,
            headers: { 'Content-Type': 'application/json' }
          });

          if (registerResponse.data.access_token && registerResponse.data.refresh_token) {
            localStorage.setItem('token', registerResponse.data.access_token);
            localStorage.setItem('refresh_token', registerResponse.data.refresh_token);
            
            // Cache user data if provided
            if (registerResponse.data.user) {
              sessionService.cacheUserData(registerResponse.data.user);
              console.log('✅ User registered on backend, JWT tokens and user data stored');
            } else {
              console.log('✅ User registered on backend, JWT tokens stored');
            }
            
            return true;
          }
        } catch (registerError) {
          console.error('❌ Register failed:', {
            status: registerError.response?.status,
            data: registerError.response?.data,
            message: registerError.message,
            fullError: registerError.response?.data
          });
          console.error('📋 Registration payload was:', { email, username, first_name: fullName.split(' ')[0] || username });
          
          // If register failed with 409 (user exists), try login
          if (registerError.response?.status === 409 || 
              registerError.response?.status === 400) {
            console.log('📝 User may already exist, attempting login...');
            
            try {
              const loginResponse = await axios.post(`${backendURL}/auth/login`, {
                email,
                password: dummyPassword
              }, {
                timeout: 10000,
                headers: { 'Content-Type': 'application/json' }
              });

              if (loginResponse.data.access_token && loginResponse.data.refresh_token) {
                localStorage.setItem('token', loginResponse.data.access_token);
                localStorage.setItem('refresh_token', loginResponse.data.refresh_token);
                
                // Cache user data if provided
                if (loginResponse.data.user) {
                  sessionService.cacheUserData(loginResponse.data.user);
                  console.log('✅ Backend login successful, JWT tokens and user data stored');
                } else {
                  console.log('✅ Backend login successful, JWT tokens stored');
                }
                
                return true;
              }
            } catch (loginError) {
              console.error('❌ Login also failed:', {
                status: loginError.response?.status,
                data: loginError.response?.data
              });
              throw loginError;
            }
          } else {
            throw registerError;
          }
        }
      } else if (syncError.response?.status === 409) {
        // User exists, try login
        console.log('📝 User exists, attempting login...');
        
        const loginResponse = await axios.post(`${backendURL}/auth/login`, {
          email,
          password: dummyPassword
        }, {
          timeout: 10000,
          headers: { 'Content-Type': 'application/json' }
        });

        if (loginResponse.data.access_token && loginResponse.data.refresh_token) {
          localStorage.setItem('token', loginResponse.data.access_token);
          localStorage.setItem('refresh_token', loginResponse.data.refresh_token);
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
  sessionService.clearUserCache();
  console.log('🧹 Backend tokens and user cache cleared');
}
