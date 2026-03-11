// src/components/ProtectedRoute.jsx

import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import pLog from '../utils/persistentLogger';

const ProtectedRoute = ({ children }) => {
  const { isLoaded, isSignedIn } = useClerkAuth();
  const location = useLocation();

  // Check if we already have backend token (indicates user was recently authenticated)
  const hasToken = !!localStorage.getItem('token');

  pLog.log('🔒 ProtectedRoute check:', { 
    isLoaded, 
    isSignedIn, 
    hasToken, 
    path: location.pathname
  });

  // If not loaded yet but we have a token, render immediately to avoid flash
  // This happens when navigating between protected routes after initial auth
  if (!isLoaded && hasToken) {
    pLog.log('✅ ProtectedRoute: Rendering immediately with token for ' + location.pathname);
    return children;
  }

  // Show nothing while loading (instead of full-screen spinner)
  // This prevents the "double blink" on login
  if (!isLoaded) {
    pLog.log('⏳ ProtectedRoute: Waiting for Clerk to load... (path: ' + location.pathname + ')');
    return null;
  }

  // Redirect to login if not signed in, save original location to redirect back after login
  if (!isSignedIn) {
    pLog.log('🚫 ProtectedRoute: Not signed in, NAVIGATING TO /auth/login (from: ' + location.pathname + ')');
    return <Navigate to="/auth/login" state={{ from: location.pathname }} replace />;
  }

  pLog.log('✅ ProtectedRoute: Rendering protected content for ' + location.pathname);
  return children;
};

export default ProtectedRoute;
