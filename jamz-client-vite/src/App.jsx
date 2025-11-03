// File: jamz-client-vite/src/App.jsx
// Project: TrafficJamz - real-time traffic management system
//
// Purpose:
//   - Defines the main application component
//   - Sets up global theme (MUI)
//   - Provides authentication context
//   - Configures client-side routing with React Router
//   - Wraps routes with Suspense for lazy loading
//   - Adds animated route transitions (Framer Motion)
//   - Protects private routes with <ProtectedRoute>
//
// Notes:
//   - Public routes: /auth/login, /auth/register, /auth/forgot-password, /groups/invitation/:inviteId
//   - Protected routes: /dashboard, /groups/:groupId, /audio-session/:sessionId, /location-tracking/:groupId, /profile, /subscription-plans
//   - Root ("/") currently redirects to /dashboard
//   - Catch-all (*) renders <NotFound />
//   - Mapbox dev route (/dev/map) is currently unprotected for testing

import React, { Suspense, lazy, useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from "framer-motion";
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { MusicProvider } from './contexts/MusicContext';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AppLoader from './components/AppLoader';
import api from './services/api';

import MapboxMap from './components/MapboxMap';

import 'mapbox-gl/dist/mapbox-gl.css';

// Lazy-loaded pages
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'));
const AuthCallback = lazy(() => import('./pages/AuthCallback'));
const InvitationAccept = lazy(() => import('./pages/groups/InvitationAccept'));

const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'));
const GroupDetail = lazy(() => import('./pages/groups/GroupDetail'));
const AudioSession = lazy(() => import('./pages/sessions/AudioSession'));
const LocationTracking = lazy(() => import('./pages/location/LocationTracking'));
const Profile = lazy(() => import('./pages/profile/Profile'));
const SubscriptionPlans = lazy(() => import('./pages/misc/SubscriptionPlans'));
const NotFound = lazy(() => import('./pages/misc/NotFound'));
// Dev-only debug page
const DevDebug = lazy(() => import('./pages/misc/DevDebug'));

// Root redirect component that checks auth status
const RootRedirect = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/auth/login" replace />;
};

function App() {
  const location = useLocation();
  
  // State for backend wake-up - check sessionStorage first to persist across navigation
  const [backendReady, setBackendReady] = useState(() => {
    const cached = sessionStorage.getItem('backendReady');
    return cached === 'true';
  });
  const [wakeupAttempts, setWakeupAttempts] = useState(0);

  const theme = createTheme({
    palette: {
      mode: 'dark',
      primary: {
        main: '#1976d2',
      },
      secondary: {
        main: '#dc004e',
      },
    },
  });

  // Wake up backend on initial load only if not already ready
  useEffect(() => {
    if (!backendReady) {
      const wakeUpBackend = async () => {
        try {
          console.log('🔄 Attempting to wake up backend...');
          setWakeupAttempts(prev => prev + 1);
          await api.get('/health', { timeout: 30000 }); // 30 second timeout for cold start
          console.log('✅ Backend is ready!');
          setBackendReady(true);
          sessionStorage.setItem('backendReady', 'true'); // Persist across navigation
        } catch (error) {
          console.warn('⚠️ Backend wake-up attempt failed, retrying...', error.message);
          // Retry after 2 seconds if it fails (max 5 attempts)
          if (wakeupAttempts < 5) {
            setTimeout(wakeUpBackend, 2000);
          } else {
            console.error('❌ Backend failed to wake up after 5 attempts');
            setBackendReady(true); // Show app anyway, let individual requests fail
            sessionStorage.setItem('backendReady', 'true'); // Persist even on failure
          }
        }
      };

      wakeUpBackend();
    }
  }, []); // Run only once on mount

  // Keep-alive ping every 60 seconds after backend is ready
  useEffect(() => {
    if (!backendReady) return;

    const keepAliveInterval = setInterval(async () => {
      try {
        await api.get('/health');
        console.log('⏰ Keep-alive ping sent');
      } catch (error) {
        console.debug('Keep-alive ping failed:', error.message);
      }
    }, 60000);

    return () => clearInterval(keepAliveInterval);
  }, [backendReady]);

  // Debug logging
  console.log('🚀 App component rendering');
  console.log('Current location:', location.pathname);

  // Show loading screen while backend wakes up
  if (!backendReady) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AppLoader 
          message={wakeupAttempts > 1 ? 'Waking up server, please wait...' : 'Initializing...'}
        />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <MusicProvider>
          <Suspense fallback={<div>Loading...</div>}>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/auth/login" element={<Login />} />
                <Route path="/auth/register" element={<Register />} />
                <Route path="/auth/forgot-password" element={<ForgotPassword />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/invitations/:groupId/:invitationIndex" element={<InvitationAccept />} />

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
                <Route path="/dev/map" element={
                  <ProtectedRoute>
                    <MapboxMap />
                  </ProtectedRoute>
                } />
                {/* Dev-only debug console (no auth required) */}
                {import.meta.env.DEV && (
                  <Route path="/dev/debug" element={<DevDebug />} />
                )}
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

                {/* Redirect root based on auth status */}
                <Route path="/" element={<RootRedirect />} />

                {/* Catch-all - redirect to login if not authenticated */}
                <Route path="*" element={
                  <ProtectedRoute>
                    <NotFound />
                  </ProtectedRoute>
                } />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </Suspense>
        </MusicProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
