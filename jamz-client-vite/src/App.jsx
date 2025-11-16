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
import musicService from './services/music.service';

import 'mapbox-gl/dist/mapbox-gl.css';

// Lazy-loaded pages
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'));
const AuthCallback = lazy(() => import('./pages/AuthCallback'));
const SpotifyCallback = lazy(() => import('./pages/auth/SpotifyCallback'));
const YouTubeCallback = lazy(() => import('./pages/auth/YouTubeCallback'));
const InvitationAccept = lazy(() => import('./pages/groups/InvitationAccept'));

const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'));
const GroupDetail = lazy(() => import('./pages/groups/GroupDetail'));
const LocationTracking = lazy(() => import('./pages/location/LocationTracking'));
const AudioSettings = lazy(() => import('./pages/audio/AudioSettings'));
const AudioSession = lazy(() => import('./pages/sessions/AudioSession'));
const MusicPlayer = lazy(() => import('./pages/music/MusicPlayer'));
const Profile = lazy(() => import('./pages/profile/Profile'));
const SubscriptionPlans = lazy(() => import('./pages/misc/SubscriptionPlans'));
const NotFound = lazy(() => import('./pages/misc/NotFound'));
// Dev-only debug page
const DevDebug = lazy(() => import('./pages/misc/DevDebug'));

// Root redirect component that checks auth status
const RootRedirect = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <AppLoader message="Checking authentication..." />;
  }

  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/auth/login" replace />;
};

function App() {
  const location = useLocation();
  
  // State for backend wake-up - use localStorage for iOS persistence, with timestamp check
  const [backendReady, setBackendReady] = useState(() => {
    try {
      const cached = localStorage.getItem('backendReady');
      const timestamp = localStorage.getItem('backendReadyTimestamp');
      // Consider backend ready if check was within last 5 minutes
      if (cached === 'true' && timestamp) {
        const age = Date.now() - parseInt(timestamp);
        if (age < 5 * 60 * 1000) { // 5 minutes
          console.log('✅ Using cached backend ready state (age:', Math.floor(age / 1000), 'seconds)');
          return true;
        }
      }
      return false;
    } catch (e) {
      console.warn('Error reading backend ready state:', e);
      return false;
    }
  });
  const [wakeupAttempts, setWakeupAttempts] = useState(0);
  const [appError, setAppError] = useState(null);

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
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            background: 'linear-gradient(135deg, #76ff03 0%, #2196f3 50%, #e91e63 100%)',
            backgroundAttachment: 'fixed',
          },
        },
      },
    },
  });

  // Wake up backend on initial load only if not already ready
  useEffect(() => {
    if (!backendReady) {
      const wakeUpBackend = async () => {
        try {
          console.log('🔄 Attempting to wake up backend... (attempt', wakeupAttempts + 1, ')');
          console.log('📍 API instance baseURL:', api.defaults.baseURL);
          console.log('🌐 Full health URL:', api.defaults.baseURL + '/health');
          setWakeupAttempts(prev => prev + 1);
          
          const response = await api.get('/health', { timeout: 30000 }); // 30 second timeout for cold start
          console.log('✅ Backend is ready!', response.data);
          setBackendReady(true);
          localStorage.setItem('backendReady', 'true');
          localStorage.setItem('backendReadyTimestamp', Date.now().toString());
          setAppError(null);
        } catch (error) {
          console.error('⚠️ Backend wake-up attempt failed:', {
            message: error.message,
            code: error.code,
            status: error.response?.status,
            data: error.response?.data,
            config: {
              url: error.config?.url,
              baseURL: error.config?.baseURL,
              timeout: error.config?.timeout
            }
          });
          // Retry after 2 seconds if it fails (max 5 attempts)
          if (wakeupAttempts < 5) {
            setTimeout(wakeUpBackend, 2000);
          } else {
            console.error('❌ Backend failed to wake up after 5 attempts');
            setAppError('Unable to connect to server. Please check your connection and refresh.');
            setBackendReady(true); // Show app anyway, let individual requests fail
            localStorage.setItem('backendReady', 'true');
            localStorage.setItem('backendReadyTimestamp', Date.now().toString());
          }
        }
      };

      wakeUpBackend();
    }
  }, []); // Run only once on mount

  // Preload YouTube API and initialize music service early
  useEffect(() => {
    const preloadMusic = async () => {
      try {
        console.log('🎵 Preloading YouTube API for instant music playback...');
        await musicService.initialize();
        console.log('✅ Music service preloaded and ready!');
      } catch (error) {
        console.warn('⚠️ Music service preload failed (will retry on first play):', error.message);
      }
    };

    preloadMusic();
  }, []); // Run once on mount

  // iOS-specific: Detect when app returns from background and refresh if needed
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('📱 App returned to foreground');
        // Check if backend ready timestamp is stale (older than 5 minutes)
        try {
          const timestamp = localStorage.getItem('backendReadyTimestamp');
          if (timestamp) {
            const age = Date.now() - parseInt(timestamp);
            if (age > 5 * 60 * 1000) {
              console.log('⚠️ Backend state is stale, resetting...');
              localStorage.removeItem('backendReady');
              localStorage.removeItem('backendReadyTimestamp');
              // Force reload to re-initialize
              window.location.reload();
            }
          }
        } catch (e) {
          console.warn('Error checking backend state on foreground:', e);
        }
      }
    };

    const handlePageShow = (event) => {
      // iOS Safari fires pageshow when returning from bfcache (back-forward cache)
      if (event.persisted) {
        console.log('📱 Page restored from bfcache');
        // Check timestamp and reload if stale
        try {
          const timestamp = localStorage.getItem('backendReadyTimestamp');
          if (timestamp) {
            const age = Date.now() - parseInt(timestamp);
            if (age > 5 * 60 * 1000) {
              console.log('⚠️ Stale state detected from bfcache, reloading...');
              window.location.reload();
            }
          }
        } catch (e) {
          console.warn('Error handling bfcache restore:', e);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []);

  // Keep-alive ping every 60 seconds after backend is ready (only when page is visible)
  useEffect(() => {
    if (!backendReady) return;

    const keepAliveInterval = setInterval(async () => {
      // Only ping if page is visible (don't waste battery on background pings)
      if (!document.hidden) {
        try {
          await api.get('/health', { timeout: 5000 });
          console.log('⏰ Keep-alive ping sent');
          // Update timestamp on successful ping
          localStorage.setItem('backendReadyTimestamp', Date.now().toString());
        } catch (error) {
          console.debug('Keep-alive ping failed:', error.message);
          // Don't clear backend ready state, just log the failure
        }
      }
    }, 60000);

    return () => clearInterval(keepAliveInterval);
  }, [backendReady]);

  // Debug logging
  console.log('🚀 App component rendering');
  console.log('Current location:', location.pathname);

  // Show loading screen while backend wakes up
  if (!backendReady) {
    const getMessage = () => {
      if (wakeupAttempts === 0) return 'Initializing...';
      if (wakeupAttempts === 1) return 'Connecting to server...';
      if (wakeupAttempts <= 3) return 'Waking up server, please wait...';
      return 'Server is taking longer than usual...';
    };

    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AppLoader 
          message={getMessage()}
          error={appError}
          onRetry={() => window.location.reload()}
        />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <MusicProvider>
          <Suspense fallback={<AppLoader message="Loading page..." />}>
          {/* TEMPORARILY DISABLED ANIMATION FOR DEBUGGING */}
          {/*<AnimatePresence mode="wait">*/}
            <motion.div
              key={location.pathname}
              initial={{ opacity: 1, y: 0 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              style={{ minHeight: '100vh' }}
              onAnimationComplete={() => console.log('✅ Page animation completed')}
            >
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/auth/login" element={<Login />} />
                <Route path="/auth/register" element={<Register />} />
                <Route path="/auth/forgot-password" element={<ForgotPassword />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/auth/spotify/callback" element={<SpotifyCallback />} />
                <Route path="/auth/youtube/callback" element={<YouTubeCallback />} />
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
                <Route path="/audio-settings/:groupId" element={
                  <ProtectedRoute>
                    <AudioSession />
                  </ProtectedRoute>
                } />
                <Route path="/music/:groupId" element={
                  <ProtectedRoute>
                    <MusicPlayer />
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
          {/*</AnimatePresence>*/}
        </Suspense>
        </MusicProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
