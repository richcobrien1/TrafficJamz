import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Configure axios defaults
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Check if user is authenticated on initial load
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get('/api/users/profile');
        setCurrentUser(response.data.user);
        setLoading(false);
      } catch (error) {
        console.error('Authentication error:', error);
        logout();
        setLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  // Login function
  const login = async (email, password) => {
    try {
      setError('');
      const response = await axios.post('/api/auth/login', { email, password });
      
      const { access_token, user } = response.data;
      
      localStorage.setItem('token', access_token);
      setToken(access_token);
      setCurrentUser(user);
      
      return user;
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to login');
      throw error;
    }
  };

  // Register function
  const register = async (userData) => {
    try {
      setError('');
      const response = await axios.post('/api/auth/register', userData);
      return response.data;
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to register');
      throw error;
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setCurrentUser(null);
  };

  // Update user profile
  const updateProfile = async (userData) => {
    try {
      setError('');
      const response = await axios.put('/api/users/profile', userData);
      setCurrentUser(response.data.user);
      return response.data.user;
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to update profile');
      throw error;
    }
  };

  const value = {
    currentUser,
    isAuthenticated: !!currentUser,
    loading,
    error,
    login,
    register,
    logout,
    updateProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
