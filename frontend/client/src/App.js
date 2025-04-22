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
            <Route path="/location-tracking/:groupId" element={
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
