# Frontend Configuration Documentation

## Overview

This document serves as the comprehensive guide for configuring the trafficjam application frontend to work with the hybrid database architecture. It consolidates all the information from the previous documents and provides a complete reference for implementing and maintaining the frontend configuration.

## Architecture Overview

The trafficjam application uses a hybrid database architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                  Trafficjam Application                     │
│                                                             │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    API Layer / Backend                      │
│                                                             │
└───────┬─────────────────────┬────────────────────┬──────────┘
        │                     │                    │
        ▼                     ▼                    ▼
┌───────────────┐    ┌────────────────┐    ┌────────────────┐
│               │    │                │    │                │
│   Supabase    │    │ MongoDB Atlas  │    │ InfluxDB Cloud │
│  (PostgreSQL) │    │  (Document DB) │    │ (Time-series)  │
│               │    │                │    │                │
└───────────────┘    └────────────────┘    └────────────────┘
        │                     │                    │
        ▼                     ▼                    ▼
┌───────────────┐    ┌────────────────┐    ┌────────────────┐
│  User Data    │    │ Groups/Location│    │ Metrics/Logs   │
│  Auth/Profiles│    │ Messages       │    │ Time-based Data│
│  Relationships│    │ Audio Sessions │    │                │
└───────────────┘    └────────────────┘    └────────────────┘
```

## Frontend Structure

The frontend is a React application with the following structure:

```
frontend/
├── client/
│   ├── public/
│   │   ├── favicon.ico
│   │   ├── index.html
│   │   ├── logo192.png
│   │   ├── logo512.png
│   │   ├── manifest.json
│   │   └── robots.txt
│   └── src/
│       ├── contexts/
│       │   └── AuthContext.js
│       ├── pages/
│       │   ├── AudioSession.js
│       │   ├── Dashboard.js
│       │   ├── ForgotPassword.js
│       │   ├── GroupDetail.js
│       │   ├── InvitationAccept.js
│       │   ├── LocationTracking.js
│       │   ├── Login.js
│       │   ├── NotFound.js
│       │   ├── Profile.js
│       │   ├── Register.js
│       │   ├── SubscriptionPlans.js
│       │   └── TestIntegration.js
│       ├── services/
│       ├── App.css
│       ├── App.js
│       ├── App.test.js
│       └── index.css
```

## Implementation Steps

### 1. Install Required Dependencies

```bash
npm install @supabase/supabase-js
```

### 2. Configure Environment Variables

Create or update the following environment files:

#### .env.local (for development)

```
REACT_APP_SUPABASE_URL=https://nrlaqkpojtvvheosnpaz.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ybGFxa3BvanR2dmhlb3NucGF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQwNjc4NDEsImV4cCI6MjA1OTY0Mzg0MX0._up9k3roeCdWru1rn3xwk4W10vQfSflSw9tqbgaYtBk
REACT_APP_API_URL=http://localhost:3001/api
```

#### .env.production (for production)

```
REACT_APP_SUPABASE_URL=https://nrlaqkpojtvvheosnpaz.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ybGFxa3BvanR2dmhlb3NucGF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQwNjc4NDEsImV4cCI6MjA1OTY0Mzg0MX0._up9k3roeCdWru1rn3xwk4W10vQfSflSw9tqbgaYtBk
REACT_APP_API_URL=https://trafficjam-kqeieirzf-v2u.vercel.app/api
```

### 3. Update Vercel Environment Variables

In the Vercel dashboard:
1. Go to your trafficjam project
2. Navigate to Settings → Environment Variables
3. Add the following environment variables:
   - `REACT_APP_SUPABASE_URL`: https://nrlaqkpojtvvheosnpaz.supabase.co
   - `REACT_APP_SUPABASE_ANON_KEY`: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ybGFxa3BvanR2dmhlb3NucGF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQwNjc4NDEsImV4cCI6MjA1OTY0Mzg0MX0._up9k3roeCdWru1rn3xwk4W10vQfSflSw9tqbgaYtBk
   - `REACT_APP_API_URL`: https://trafficjam-kqeieirzf-v2u.vercel.app/api

### 4. Update AuthContext.js

Replace the existing AuthContext.js with the following implementation:

```javascript
// src/contexts/AuthContext.js
import { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check for existing session on load
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error checking session:', error);
          setIsAuthenticated(false);
        } else if (session) {
          setCurrentUser(session.user);
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Session check error:', error);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session) {
          setCurrentUser(session.user);
          setIsAuthenticated(true);
        } else {
          setCurrentUser(null);
          setIsAuthenticated(false);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Login function
  const login = async (email, password) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Register function
  const register = async (email, password, userData) => {
    setLoading(true);
    try {
      // Register the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      });

      if (authError) throw authError;
      
      return authData;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Reset password function
  const resetPassword = async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  };

  const value = {
    currentUser,
    isAuthenticated,
    loading,
    login,
    register,
    logout,
    resetPassword
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
```

### 5. Create API Service Layer

Create a new file `src/services/api.service.js`:

```javascript
// src/services/api.service.js
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Base API URL for backend services
const API_URL = process.env.REACT_APP_API_URL;

// User-related API calls (PostgreSQL via Supabase)
export const userService = {
  // Get user profile
  getUserProfile: async (userId) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  },
  
  // Update user profile
  updateUserProfile: async (userId, profileData) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .update(profileData)
        .eq('user_id', userId)
        .select();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }
};

// Group-related API calls (MongoDB via backend API)
export const groupService = {
  // Get all groups
  getGroups: async () => {
    try {
      const response = await fetch(`${API_URL}/groups`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching groups:', error);
      throw error;
    }
  },
  
  // Get group by ID
  getGroupById: async (groupId) => {
    try {
      const response = await fetch(`${API_URL}/groups/${groupId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Error fetching group ${groupId}:`, error);
      throw error;
    }
  },
  
  // Create new group
  createGroup: async (groupData) => {
    try {
      const response = await fetch(`${API_URL}/groups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(groupData)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error creating group:', error);
      throw error;
    }
  }
};

// Location-related API calls (MongoDB via backend API)
export const locationService = {
  // Get user locations
  getUserLocations: async (userId) => {
    try {
      const response = await fetch(`${API_URL}/locations/user/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching user locations:', error);
      throw error;
    }
  },
  
  // Update user location
  updateUserLocation: async (locationData) => {
    try {
      const response = await fetch(`${API_URL}/locations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(locationData)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error updating location:', error);
      throw error;
    }
  }
};
```

### 6. Update Login Component

Update the Login component to use the Supabase authentication:

```javascript
// src/pages/Login.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  Paper,
  Grid,
  CircularProgress
} from '@mui/material';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }
    
    try {
      setError('');
      setIsSubmitting(true);
      
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Failed to log in. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, mb: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" align="center" gutterBottom>
            Log In
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
            />
            
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={isSubmitting}
            >
              {isSubmitting ? <CircularProgress size={24} /> : 'Log In'}
            </Button>
            
            <Grid container>
              <Grid item xs>
                <Link to="/forgot-password" style={{ textDecoration: 'none' }}>
                  <Typography variant="body2" color="primary">
                    Forgot password?
                  </Typography>
                </Link>
              </Grid>
              <Grid item>
                <Link to="/register" style={{ textDecoration: 'none' }}>
                  <Typography variant="body2" color="primary">
                    Don't have an account? Sign Up
                  </Typography>
                </Link>
              </Grid>
            </Grid>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}

export default Login;
```

### 7. Create or Update ProtectedRoute Component

Create a new file `src/components/ProtectedRoute.js`:

```javascript
// src/components/ProtectedRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return children;
};

export default ProtectedRoute;
```

### 8. Update App.js

Ensure App.js is properly configured with the AuthProvider and routes:

```javascript
// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './contexts/AuthContext';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import GroupDetail from './pages/GroupDetail';
import AudioSession from './pages/AudioSession';
import LocationTracking from './pages/LocationTracking';
import Profile from './pages/Profile';
import SubscriptionPlans from './pages/SubscriptionPlans';
import ForgotPassword from './pages/ForgotPassword';
import TestIntegration from './pages/TestIntegration';
import NotFound from './pages/NotFound';
import InvitationAccept from './pages/InvitationAccept';

// Components
import ProtectedRoute from './components/ProtectedRoute';

// Create theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/invitation/:inviteId" element={<InvitationAccept />} />
            
            {/* Protected routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/groups/:groupId" element={
              <ProtectedRoute>
                <GroupDetail />
              </ProtectedRoute>
            } />
            <Route path="/audio-session/:sessionId" element={
              <ProtectedRoute>
                <AudioSession />
              </ProtectedRoute>
            } />
            <Route path="/location-tracking" element={
              <ProtectedRoute>
                <LocationTracking />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            <Route path="/subscription-plans" element={
              <ProtectedRoute>
                <SubscriptionPlans />
              </ProtectedRoute>
            } />
            <Route path="/test-integration" element={
              <ProtectedRoute>
                <TestIntegration />
              </ProtectedRoute>
            } />
            
            {/* Redirect root to dashboard if authenticated, otherwise to login */}
            <Route path="/" element={<Navigate to="/dashboard" />} />
            
            {/* 404 route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
```

## Deployment Process

### 1. Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm start
   ```

3. Test the application locally:
   - Verify login functionality
   - Test protected routes
   - Ensure data is loading correctly

### 2. Production Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Deploy to Vercel:
   ```bash
   vercel --prod
   ```

3. Verify environment variables in Vercel:
   - Go to your trafficjam project in the Vercel dashboard
   - Navigate to Settings → Environment Variables
   - Ensure all required environment variables are set

## Testing

Follow the comprehensive testing procedures outlined in the Frontend Testing Procedures document to verify the implementation:

1. **Authentication Testing**:
   - Test login functionality
   - Test registration functionality
   - Test protected routes
   - Test logout functionality

2. **Data Integration Testing**:
   - Test Supabase data loading
   - Test MongoDB data loading via API
   - Test data updates

3. **Cross-Browser Testing**:
   - Test in Chrome, Firefox, Safari, and Edge
   - Test responsive design

4. **Mobile Testing**:
   - Test on various device sizes
   - Test touch interactions

5. **Error Handling Testing**:
   - Test network errors
   - Test API errors
   - Test authentication errors

## Troubleshooting

### Common Issues and Solutions

1. **Login not working**:
   - Check browser console for errors
   - Verify Supabase credentials are correct
   - Ensure the user exists in Supabase

2. **Protected routes not redirecting properly**:
   - Check that the AuthContext is properly set up
   - Verify the ProtectedRoute component is correctly implemented
   - Check that isAuthenticated state is being set correctly

3. **Environment variables not working**:
   - Ensure environment variables are prefixed with REACT_APP_
   - Restart the development server after changing environment variables
   - Check that environment variables are properly set in Vercel

4. **CORS issues**:
   - Ensure the backend API allows requests from the frontend domain
   - Check that Supabase is configured to allow requests from your domain

## Maintenance and Updates

### Regular Maintenance Tasks

1. **Update Dependencies**:
   - Regularly update npm packages to ensure security and performance
   - Test thoroughly after updates

2. **Monitor Error Logs**:
   - Set up error tracking (e.g., Sentry)
   - Regularly review error logs

3. **Performance Monitoring**:
   - Monitor application performance
   - Optimize as needed

### Future Enhancements

1. **Additional Authentication Methods**:
   - Social login (Google, Facebook, etc.)
   - Two-factor authentication

2. **Improved Error Handling**:
   - More detailed error messages
   - Better user feedback

3. **Offline Support**:
   - Implement service workers
   - Add offline data caching

## Conclusion

This document provides a comprehensive guide for configuring the trafficjam application frontend to work with the hybrid database architecture. By following the implementation steps and testing procedures outlined here, you can ensure that your frontend is properly connected to your backend services and functions correctly.

The hybrid approach leverages the strengths of each database type:
- Supabase (PostgreSQL) for relational data and authentication
- MongoDB Atlas for document data
- InfluxDB for time-series data

This configuration ensures that your application is scalable, maintainable, and performs well for all types of data.
