// frontend/src/App.js

import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from "framer-motion";
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

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

// Theme setup
const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#dc004e' },
    background: { default: '#f5f5f5' },
  },
});

function App() {

const location = useLocation();

  return (
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
                <Route path="/groups/invitation/:inviteId" element={<InvitationAccept />} />

                {/* Protected routes with optional role guards */}
                <Route path="/dashboard" element={
                  <ProtectedRoute allowedRoles={["agent", "field", "ops"]}>
                    <Dashboard />
                  </ProtectedRoute>
                } />
                <Route path="/groups/:groupId" element={
                  <ProtectedRoute>
                    <GroupDetail />
                  </ProtectedRoute>
                } />
                <Route path="/audio/:sessionId" element={
                  <ProtectedRoute>
                    <AudioSession />
                  </ProtectedRoute>
                } />
                <Route path="/location/map" element={
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

                {/* Redirect root */}
                <Route path="/" element={<Navigate to="/dashboard" />} />

                {/* Catch-all */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </Suspense>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
