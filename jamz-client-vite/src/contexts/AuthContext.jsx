// AuthContext.jsx
// This file manages authentication state and provides methods for login, registration, and user management. 

import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

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

  useEffect(() => {
    // Check for existing token on component mount
    const checkAuth = async () => {
      try {
        setLoading(true);
        
        // Check if we have a token in localStorage
        const token = localStorage.getItem('token');
        if (token) {
          console.log('Found existing token in localStorage');
          
          // Fetch user profile with the token
          try {
            const response = await api.get('/api/users/profile');
            if (response.data) {
              setUser(response.data);
              console.log('User profile fetched successfully');
            }
          } catch (profileError) {
            console.warn('Could not fetch user profile:', profileError);
            // Token might be invalid, remove it
            localStorage.removeItem('token');
            setUser(null);
          }
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);
  
  // Login with email and password
  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Attempting login with:', email);
      const response = await api.post('/api/auth/login', { email, password });
      
      if (response.data) {
        console.log('Login successful');
        setUser(response.data.user);
        
        // Store token for API calls - CRITICAL
        localStorage.setItem('token', response.data.access_token);
        console.log('Token stored in localStorage after login');
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
      setLoading(true);
      setError(null);
      
      const response = await api.post('/api/auth/register', userData);
      
      if (response.data) {
        setUser(response.data.user);
        
        // Store token for API calls - CRITICAL
        localStorage.setItem('token', response.data.access_token);
        console.log('Token stored in localStorage after registration');
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
        await api.post('/api/auth/logout');
      } catch (logoutError) {
        console.warn('Logout API call failed:', logoutError);
        // Continue with local logout even if API call fails
      }
      
      setUser(null);
      
      // Remove token from localStorage - CRITICAL
      localStorage.removeItem('token');
      console.log('Token removed from localStorage after logout');
    } catch (error) {
      console.error('Logout error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Reset password
  const resetPassword = async (email) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.post('/api/auth/reset-password', { email });
      
      return response.data;
    } catch (error) {
      console.error('Password reset error:', error);
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
      
      const response = await api.post('/api/auth/change-password', { 
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
      
      const response = await api.put('/api/users/profile', userData);
      
      if (response.data) {
        setUser(response.data);
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
  
  // Get current auth token
  const getToken = () => {
    return localStorage.getItem('token');
  };

  // Value object that will be shared with components that use this context
  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    resetPassword,
    updatePassword,
    updateProfile,
    getToken,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
