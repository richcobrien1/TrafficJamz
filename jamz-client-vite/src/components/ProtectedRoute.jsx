// src/components/ProtectedRoute.jsx

import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";

const ProtectedRoute = ({ children }) => {
  const { isLoaded, isSignedIn } = useClerkAuth();
  const location = useLocation();

  // Check if we already have backend token (indicates user was recently authenticated)
  const hasToken = !!localStorage.getItem('token');

  console.log('🔒 ProtectedRoute check:', { 
    isLoaded, 
    isSignedIn, 
    hasToken, 
    path: location.pathname,
    timestamp: new Date().toISOString()
  });

  // If not loaded yet but we have a token, render immediately to avoid flash
  // This happens when navigating between protected routes after initial auth
  if (!isLoaded && hasToken) {
    console.log('✅ ProtectedRoute: Rendering immediately with token');
    return children;
  }

  // Show nothing while loading (instead of full-screen spinner)
  // This prevents the "double blink" on login
  if (!isLoaded) {
    console.log('⏳ ProtectedRoute: Waiting for Clerk to load...');
    return null;
  }

  // Redirect to login if not signed in, save original location to redirect back after login
  if (!isSignedIn) {
    console.log('🚫 ProtectedRoute: Not signed in, redirecting to login');
    return <Navigate to="/auth/login" state={{ from: location.pathname }} replace />;
  }

  console.log('✅ ProtectedRoute: Rendering protected content');
  return children;
};

export default ProtectedRoute;
