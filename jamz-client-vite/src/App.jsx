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
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ClerkProvider, SignedIn, SignedOut, RedirectToSignIn, useUser } from '@clerk/clerk-react';
import { AnimatePresence, motion } from "framer-motion";
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { Box } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import { MusicProvider } from './contexts/MusicContext';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AppLoader from './components/AppLoader';
import ErrorBoundary from './components/ErrorBoundary';
import ClerkBackendSync from './components/ClerkBackendSync';
import NativeAppPrompt from './components/NativeAppPrompt';
import api from './services/api';
import pLog from './utils/persistentLogger';

import MapboxMap from './components/MapboxMap';
import musicService from './services/music.service';

import 'mapbox-gl/dist/mapbox-gl.css';

// Get Clerk publishable key from environment
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!clerkPubKey) {
  console.warn('Missing Clerk Publishable Key - authentication may not work');
}

// Lazy-loaded pages
const Login = lazy(() => import('./pages/auth/Login'));
const ElectronLogin = lazy(() => import('./pages/auth/ElectronLogin'));
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
const Download = lazy(() => import('./pages/Download'));
const AudioSession = lazy(() => import('./pages/sessions/AudioSession'));
const MusicPlayer = lazy(() => import('./pages/music/MusicPlayer'));
const Profile = lazy(() => import('./pages/profile/Profile'));
const SubscriptionPlans = lazy(() => import('./pages/misc/SubscriptionPlans'));
const NotFound = lazy(() => import('./pages/misc/NotFound'));
// Dev-only debug page
const DevDebug = lazy(() => import('./pages/misc/DevDebug'));

// Root redirect component that checks auth status
const RootRedirect = () => {
  const { isLoaded, isSignedIn } = useUser();
  const navigate = useNavigate();
  const hasRedirectedRef = React.useRef(false);
  
  // Check localStorage for token to speed up redirect decision
  const hasToken = !!localStorage.getItem('token');

  pLog.log('🔄 RootRedirect check:', { isLoaded, isSignedIn, hasToken, hasRedirected: hasRedirectedRef.current });

  // Prevent infinite redirect loops - only redirect once using ref that persists across renders
  React.useEffect(() => {
    if (hasRedirectedRef.current) {
      pLog.log('⏹️ RootRedirect: Already redirected, preventing loop');
      return;
    }

    // If we have a token, assume authenticated and go to dashboard immediately
    if (hasToken && !isLoaded) {
      pLog.log('🎯 RootRedirect: Token found, navigating to /dashboard');
      hasRedirectedRef.current = true;
      navigate('/dashboard', { replace: true });
      return;
    }

    // If Clerk isn't loaded and no token, default to login
    if (!isLoaded) {
      pLog.log('⏳ RootRedirect: Clerk not loaded, navigating to /auth/login');
      hasRedirectedRef.current = true;
      navigate('/auth/login', { replace: true });
      return;
    }

    // Clerk is loaded, redirect based on sign-in status
    const destination = isSignedIn ? "/dashboard" : "/auth/login";
    pLog.log('🎯 RootRedirect: Navigating to ' + destination, { isSignedIn });
    hasRedirectedRef.current = true;
    navigate(destination, { replace: true });
  }, [isLoaded, isSignedIn, hasToken, navigate]);

  // Show nothing while redirecting
  return null;
};

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  
  pLog.log('🚀 App component rendering', { path: location.pathname });
  
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
  const [isOnline, setIsOnline] = useState(navigator.onLine);

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
      // Max wait time before giving up and showing the app anyway (iOS Safari failsafe)
      const maxWaitTimeout = setTimeout(() => {
        console.warn('⚠️ Backend health check timeout - proceeding anyway (iOS Safari failsafe)');
        setBackendReady(true);
        localStorage.setItem('backendReady', 'true');
        localStorage.setItem('backendReadyTimestamp', Date.now().toString());
      }, 10000); // 10 seconds max wait

      const wakeUpBackend = async () => {
        try {
          console.log('🔄 Attempting to wake up backend... (attempt', wakeupAttempts + 1, ')');
          console.log('📍 API instance baseURL:', api.defaults.baseURL);
          console.log('🌐 Full health URL:', api.defaults.baseURL + '/health');
          setWakeupAttempts(prev => prev + 1);
          
          // Shorter timeout for iOS Safari (5 seconds instead of 30)
          const response = await api.get('/health', { timeout: 5000 });
          console.log('✅ Backend is ready!', response.data);
          pLog.log('✅ Backend health check passed, setting backendReady=true');
          clearTimeout(maxWaitTimeout);
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
          // Retry after 1.5 seconds if it fails (max 3 attempts for faster failover)
          if (wakeupAttempts < 3) {
            setTimeout(wakeUpBackend, 1500);
          } else {
            console.error('❌ Backend failed to wake up after 3 attempts');
            clearTimeout(maxWaitTimeout);
            setBackendReady(true); // Show app anyway, let individual requests fail
            localStorage.setItem('backendReady', 'true');
            localStorage.setItem('backendReadyTimestamp', Date.now().toString());
          }
        }
      };

      wakeUpBackend();

      return () => clearTimeout(maxWaitTimeout);
    }
  }, []); // Run only once on mount

  // Preload YouTube API and initialize music service early
  useEffect(() => {
    const preloadMusic = () => {
      try {
        console.log('🎵 Preloading music service for instant playback...');
        musicService.initialize();
        console.log('✅ Music service preloaded and ready!');
      } catch (error) {
        console.warn('⚠️ Music service preload failed:', error.message);
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

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => {
      console.log('📡 Network: ONLINE');
      setIsOnline(true);
    };
    const handleOffline = () => {
      console.log('📴 Network: OFFLINE');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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
      <ClerkProvider 
        publishableKey={clerkPubKey}
        signInFallbackRedirectUrl="/dashboard"
        signUpFallbackRedirectUrl="/dashboard"
        signInUrl="/auth/login"
        signUpUrl="/auth/register"
      >
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <AppLoader 
            message={getMessage()}
            error={appError}
          onRetry={() => window.location.reload()}
        />
        </ThemeProvider>
      </ClerkProvider>
    );
  }

  return (
    <ClerkProvider 
      publishableKey={clerkPubKey}
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
      signInUrl="/auth/login"
      signUpUrl="/auth/register"
    >
      <ClerkBackendSync />
      <ThemeProvider theme={theme}>
        <CssBaseline />
      {!isOnline && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bgcolor: 'warning.main',
            color: 'warning.contrastText',
            py: 1,
            px: 2,
            textAlign: 'center',
            zIndex: 9999,
            fontSize: '0.9rem',
            fontWeight: 500,
          }}
        >
          📴 OFFLINE MODE - Showing last known data. Connect to internet for live updates.
        </Box>
      )}
      <ErrorBoundary>
        <MusicProvider>
          <NativeAppPrompt />
          <Suspense fallback={null}>
            {/* TEMPORARILY DISABLED ANIMATION FOR DEBUGGING */}
            {/*<AnimatePresence mode="wait">*/}
              {/*<motion.div
                key={location.pathname}
                initial={{ opacity: 1, y: 0 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                style={{ minHeight: '100vh' }}
                onAnimationComplete={() => console.log('✅ Page animation completed')}
              >*/}
                <Routes>
                  {/* Public routes */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/auth/login" element={<Login />} />
                  <Route path="/auth/register" element={<Register />} />
                  <Route path="/auth/register/*" element={<Register />} />
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
                  <Route path="/download" element={
                    <ProtectedRoute>
                      <Download />
                    </ProtectedRoute>
                  } />
                  <Route path="/subscription-plans" element={
                    <ProtectedRoute>
                      <SubscriptionPlans />
                    </ProtectedRoute>
                  } />

                  {/* Redirect root based on auth status */}
                  <Route path="/" element={<RootRedirect />} />

                  {/* Catch-all - show 404 page */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              {/*</motion.div>*/}
            {/*</AnimatePresence>*/}
          </Suspense>
        </MusicProvider>
      </ErrorBoundary>
      </ThemeProvider>
    </ClerkProvider>
  );
}

export default App;
