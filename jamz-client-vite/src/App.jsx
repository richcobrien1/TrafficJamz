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

import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ClerkProvider, SignedIn, SignedOut, RedirectToSignIn, useUser } from '@clerk/clerk-react';
import { AnimatePresence, motion } from "framer-motion";
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute.jsx';

import MapboxMap from './components/MapboxMap';

import 'mapbox-gl/dist/mapbox-gl.css';

// Get Clerk publishable key from environment
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!clerkPubKey) {
  throw new Error('Missing Clerk Publishable Key');
}

// Lazy-loaded pages
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
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
  const { isLoaded, isSignedIn } = useUser();

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  return isSignedIn ? <Navigate to="/dashboard" replace /> : <Navigate to="/auth/login" replace />;
};

function App() {
  const location = useLocation();

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

  // Debug logging
  console.log('🚀 App component rendering');
  console.log('Current location:', location.pathname);

  return (
    <ClerkProvider publishableKey={clerkPubKey}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
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
                  <Route path="/auth/login" element={<Login />} />
                  <Route path="/auth/register" element={<Register />} />
                  <Route path="/auth/forgot-password" element={<ForgotPassword />} />
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
        </AuthProvider>
      </ThemeProvider>
    </ClerkProvider>
  );
}

export default App;
