// AuthContext.jsx
// This file manages authentication state and provides methods for login, registration, and user management. 

import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { configService } from '../services/api.service';
import sessionService from '../services/session.service';

// Create the auth context
const AuthContext = createContext();

// Custom hook to use the auth context
export const useAuth = () => {
  return useContext(AuthContext);
};

// Provider component that wraps your app and makes auth object available to any child component that calls useAuth()
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [config, setConfig] = useState(null);

  useEffect(() => {
    // Skip auth check for dev routes that don't need authentication
    if (window.location.pathname.startsWith('/dev/')) {
      setLoading(false);
      return;
    }
    
    // Check for existing token on component mount
    const checkAuth = async () => {
      try {
        setLoading(true);
        
        // Check if we have a token in localStorage
        const token = localStorage.getItem('token');
        if (!token) {
          setLoading(false);
          return;
        }
        
        if (import.meta.env.MODE === 'development') console.log('Found existing token in localStorage');
        
        // Try to load cached user data first for instant display
        const cachedUser = sessionService.getCachedUserData();
        const cachedConfig = sessionService.getCachedConfigData();
        
        if (cachedUser) {
          console.log('📦 Using cached user data for instant display');
          setUser(cachedUser);
          if (cachedConfig) {
            setConfig(cachedConfig);
          }
        }
        
        // Set a timeout for the API call (30s to handle Render cold starts in desktop app)
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Auth check timeout')), 30000);
        });
        
        // Fetch fresh user profile in background
        const profilePromise = api.get('/users/profile');
        
        try {
          const response = await Promise.race([profilePromise, timeoutPromise]);
          
          if (response.data) {
            // Normalize user data - handle both response.data.user and response.data formats
            const userData = response.data.user || response.data;
            setUser(userData);
            
            // Cache fresh user data
            sessionService.cacheUserData(userData);
            
            if (import.meta.env.MODE === 'development') {
              console.log('User profile fetched successfully:', userData);
              console.log('Notification settings:', {
                email_notifications: userData.email_notifications,
                push_notifications: userData.push_notifications,
                proximity_alerts: userData.proximity_alerts,
                group_invitations: userData.group_invitations
              });
            }
            
            // Load client config
            try {
              const configResponse = await configService.getClientConfig();
              setConfig(configResponse.config);
              // Cache config data
              sessionService.cacheConfigData(configResponse.config);
              if (import.meta.env.MODE === 'development') console.log('Client config loaded successfully');
            } catch (configError) {
              console.warn('Could not fetch client config:', configError);
            }
          }
        } catch (fetchError) {
          // If we have cached data and just failed to refresh, keep using cached data
          if (cachedUser) {
            console.log('⚠️ Failed to refresh user data, using cached version');
            // Don't throw error if we have cached data
          } else {
            // No cached data and fetch failed - this is a real error
            throw fetchError;
          }
        }
      } catch (error) {
        console.error('❌ Could not fetch user profile:', {
          message: error.message,
          status: error.response?.status,
          url: error.config?.url,
          isTimeout: error.message.includes('timeout'),
          isNetworkError: !error.response,
          platform: window.electron ? 'DESKTOP' : 'WEB'
        });
        
        // Only clear token if it's a 401 (unauthorized) - keep token for network errors
        if (error.response?.status === 401) {
          console.log('🔐 Token invalid (401) - clearing auth data');
          localStorage.removeItem('token');
          localStorage.removeItem('refresh_token');
          sessionService.clearAll();
          setUser(null);
        }
        // For other errors (network, timeout), keep token and user state
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);
  
  // Login with email and password
  const login = async (email, password) => {
    try {
      // Check if online before attempting login
      if (!navigator.onLine) {
        throw new Error('📴 Cannot log in while offline. Please connect to the internet and try again.');
      }

      setLoading(true);
      setError(null);

      if (import.meta.env.MODE === 'development') console.log('Attempting login with:', email);
      const response = await api.post('/auth/login', { email, password });

      if (response.data) {
        // Normalize user data - handle both response.data.user and response.data formats
        const userData = response.data.user || response.data;
        setUser(userData);
        
        // Cache user data for session persistence
        sessionService.cacheUserData(userData);

        // Store token for API calls - CRITICAL
        localStorage.setItem('token', response.data.access_token);
        if (response.data.refresh_token) {
          localStorage.setItem('refresh_token', response.data.refresh_token);
        }
        if (import.meta.env.MODE === 'development') {
          console.log('Token stored in localStorage after login');
          console.log('User data after login:', userData);
          console.log('Notification settings after login:', {
            email_notifications: userData.email_notifications,
            push_notifications: userData.push_notifications,
            proximity_alerts: userData.proximity_alerts,
            group_invitations: userData.group_invitations
          });
        }

        // Load client config
        try {
          const configResponse = await configService.getClientConfig();
          setConfig(configResponse.config);
          if (import.meta.env.MODE === 'development') console.log('Client config loaded successfully');
        } catch (configError) {
          console.warn('Could not fetch client config:', configError);
        }
      }

      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      setError(error.response?.data?.message || error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  // Register new user
  const register = async (userData) => {
    try {
      // Check if online before attempting registration
      if (!navigator.onLine) {
        throw new Error('📴 Cannot register while offline. Please connect to the internet and try again.');
      }

      setLoading(true);
      setError(null);
      
  const response = await api.post('/auth/register', userData);
      
      if (response.data) {
        // Normalize user data - handle both response.data.user and response.data formats
        const userData = response.data.user || response.data;
        setUser(userData);
        
        // Cache user data for session persistence
        sessionService.cacheUserData(userData);
        
        // Store token for API calls - CRITICAL
        localStorage.setItem('token', response.data.access_token);
        if (response.data.refresh_token) {
          localStorage.setItem('refresh_token', response.data.refresh_token);
        }
        console.log('Token stored in localStorage after registration');
        
        // Load client config
        try {
          const configResponse = await configService.getClientConfig();
          setConfig(configResponse.config);
          if (import.meta.env.MODE === 'development') console.log('Client config loaded successfully');
        } catch (configError) {
          console.warn('Could not fetch client config:', configError);
        }
      }
      
      return response.data;
    } catch (error) {
      console.error('Registration error:', error);
      setError(error.response?.data?.message || error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  // Logout user
  const logout = async () => {
    try {
      setLoading(true);
      
      // Call logout endpoint if needed
  try {
  await api.post('/auth/logout');
      } catch (logoutError) {
        console.warn('Logout API call failed:', logoutError);
        // Continue with local logout even if API call fails
      }
      
      setUser(null);
      
      // Remove token from localStorage - CRITICAL
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
      
      // Clear all cached session data
      sessionService.clearAll();
      
      console.log('Token and cached data removed after logout');
    } catch (error) {
      console.error('Logout error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Reset password - request reset
  const resetPassword = async (email) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.post('/auth/forgot-password', { email });
      
      return response.data;
    } catch (error) {
      console.error('Password reset error:', error);
      setError(error.response?.data?.message || error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Confirm password reset with token
  const confirmPasswordReset = async (token, email, newPassword) => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.post('/auth/reset-password', {
        token,
        email,
        password: newPassword
      });

      return response.data;
    } catch (error) {
      console.error('Password reset confirmation error:', error);
      setError(error.response?.data?.message || error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  // Update password
  const updatePassword = async (currentPassword, newPassword) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.post('/auth/change-password', { 
        currentPassword, 
        newPassword 
      });
      
      return response.data;
    } catch (error) {
      console.error('Update password error:', error);
      setError(error.response?.data?.message || error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  // Update user profile
  const updateProfile = async (userData) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.put('/users/profile', userData);
      
      if (response.data) {
        // Normalize user data - handle both response.data.user and response.data formats
        const userData = response.data.user || response.data;
        setUser(userData);
      }
      
      return response.data;
    } catch (error) {
      console.error('Update profile error:', error);
      setError(error.response?.data?.message || error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  // Update notification settings
  const updateNotificationSettings = async (notificationData) => {
    try {
      setLoading(true);
      setError(null);
      
      // For now, save notification settings through profile update
      // In a real implementation, this would be a separate endpoint
      const response = await api.put('/users/profile', { 
        email_notifications: notificationData.email_notifications,
        push_notifications: notificationData.push_notifications,
        proximity_alerts: notificationData.proximity_alerts,
        group_invitations: notificationData.group_invitations
      });
      
      if (response.data) {
        // Normalize user data - handle both response.data.user and response.data formats
        const userData = response.data.user || response.data;
        setUser(userData);
      }
      
      return response.data;
    } catch (error) {
      console.error('Update notification settings error:', error);
      setError(error.response?.data?.message || error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  // Enable 2FA
  const enable2FA = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.post('/auth/2fa/enable');
      
      return response.data;
    } catch (error) {
      console.error('Enable 2FA error:', error);
      setError(error.response?.data?.message || error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  // Verify 2FA setup
  const verify2FA = async (token) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.post('/auth/2fa/verify', { token });
      
      if (response.data) {
        // Normalize user data - handle both response.data.user and response.data formats
        const userData = response.data.user || response.data;
        setUser(userData);
      }
      
      return response.data;
    } catch (error) {
      console.error('Verify 2FA error:', error);
      setError(error.response?.data?.message || error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  // Disable 2FA
  const disable2FA = async (password) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.post('/auth/2fa/disable', { password });
      
      if (response.data) {
        // Normalize user data - handle both response.data.user and response.data formats
        const userData = response.data.user || response.data;
        setUser(userData);
      }
      
      return response.data;
    } catch (error) {
      console.error('Disable 2FA error:', error);
      setError(error.response?.data?.message || error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  // Get current auth token
  const getToken = () => {
    return localStorage.getItem('token');
  };

  // Refresh user profile from backend
  const refreshUser = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('[AuthContext] Cannot refresh user - no token');
      return;
    }

    try {
      console.log('[AuthContext] Refreshing user profile from backend...');
      const response = await api.get('/users/profile');
      
      if (response.data) {
        const userData = response.data.user || response.data;
        setUser(userData);
        // Update cache with fresh data
        sessionService.cacheUserData(userData);
        console.log('[AuthContext] User profile refreshed successfully');
        return userData;
      }
    } catch (error) {
      console.error('[AuthContext] Failed to refresh user:', error);
      throw error;
    }
  };

  // Value object that will be shared with components that use this context
  const value = {
    user,
    loading,
    error,
    config,
    login,
    register,
    logout,
    resetPassword,
    confirmPasswordReset,
    updatePassword,
    updateProfile,
    updateNotificationSettings,
    enable2FA,
    verify2FA,
    disable2FA,
    getToken,
    setUser,
    refreshUser,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
