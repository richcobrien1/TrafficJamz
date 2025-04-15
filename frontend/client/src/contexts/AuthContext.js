import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../services/supabaseClient';

// Create the auth context
const AuthContext = createContext();

// Custom hook to use the auth context
export const useAuth = () => {
  return useContext(AuthContext);
};

// Provider component that wraps your app and makes auth object available to any child component that calls useAuth()
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check for existing session on component mount
    const checkSession = async () => {
      try {
        setLoading(true);
        
        // First check if we have a token in localStorage
        const token = localStorage.getItem('token');
        if (token) {
          console.log('Found existing token in localStorage');
        }
        
        // Get current session from Supabase
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          throw error;
        }
        
        if (data && data.session) {
          console.log('Found active Supabase session');
          setSession(data.session);
          setUser(data.session.user);
          
          // Store the token for API calls - CRITICAL for authentication
          localStorage.setItem('token', data.session.access_token);
          console.log('Token stored in localStorage');
        }
      } catch (error) {
        console.error('Session check error:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };
    
    checkSession();
    
    // Set up auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        console.log('Auth state changed:', event);
        
        if (newSession) {
          setSession(newSession);
          setUser(newSession.user);
          
          // Update token in localStorage when session changes - CRITICAL
          localStorage.setItem('token', newSession.access_token);
          console.log('Token updated in localStorage after auth state change');
        } else {
          setSession(null);
          setUser(null);
          localStorage.removeItem('token');
          console.log('Token removed from localStorage after logout');
        }
        
        setLoading(false);
      }
    );
    
    // Clean up subscription on unmount
    return () => {
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);
  
  // Login with email and password
  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Attempting login with:', email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        throw error;
      }
      
      console.log('Login successful');
      setSession(data.session);
      setUser(data.user);
      
      // Store token for API calls - CRITICAL
      localStorage.setItem('token', data.session.access_token);
      console.log('Token stored in localStorage after login');
      
      return data;
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message);
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
      
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            first_name: userData.first_name,
            last_name: userData.last_name,
            username: userData.username
          }
        }
      });
      
      if (error) {
        throw error;
      }
      
      // If auto-confirm is enabled, we'll have a session
      if (data.session) {
        setSession(data.session);
        setUser(data.user);
        
        // Store token for API calls - CRITICAL
        localStorage.setItem('token', data.session.access_token);
        console.log('Token stored in localStorage after registration');
      }
      
      return data;
    } catch (error) {
      console.error('Registration error:', error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  // Logout user
  const logout = async () => {
    try {
      setLoading(true);
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw error;
      }
      
      setSession(null);
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
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      
      if (error) {
        throw error;
      }
      
      return true;
    } catch (error) {
      console.error('Password reset error:', error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  // Update password
  const updatePassword = async (newPassword) => {
    try {
      setLoading(true);
      setError(null);
      
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) {
        throw error;
      }
      
      return true;
    } catch (error) {
      console.error('Update password error:', error);
      setError(error.message);
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
      
      const { data, error } = await supabase.auth.updateUser({
        data: userData
      });
      
      if (error) {
        throw error;
      }
      
      setUser(data.user);
      
      return data;
    } catch (error) {
      console.error('Update profile error:', error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  // Get current auth token
  const getToken = async () => {
    // Try from localStorage first
    const token = localStorage.getItem('token');
    if (token) {
      console.log('Retrieved token from localStorage');
      return token;
    }
    
    // If not in localStorage, try to get from session
    const { data } = await supabase.auth.getSession();
    if (data && data.session) {
      const newToken = data.session.access_token;
      localStorage.setItem('token', newToken);
      console.log('Retrieved token from Supabase session and stored in localStorage');
      return newToken;
    }
    
    console.warn('No token found in localStorage or session');
    return null;
  };

  // Value object that will be shared with components that use this context
  const value = {
    user,
    session,
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
