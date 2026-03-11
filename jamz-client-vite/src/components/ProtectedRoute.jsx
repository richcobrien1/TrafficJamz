// src/components/ProtectedRoute.jsx

import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";

const ProtectedRoute = ({ children }) => {
  const { isLoaded, isSignedIn } = useClerkAuth();
  const location = useLocation();

  // Check if we already have backend token (indicates user was recently authenticated)
  const hasToken = !!localStorage.getItem('token');

  // If not loaded yet but we have a token, render immediately to avoid flash
  // This happens when navigating between protected routes after initial auth
  if (!isLoaded && hasToken) {
    return children;
  }

  // Show nothing while loading (instead of full-screen spinner)
  // This prevents the "double blink" on login
  if (!isLoaded) {
    return null;
  }

  // Redirect to login if not signed in, save original location to redirect back after login
  if (!isSignedIn) {
    return <Navigate to="/auth/login" state={{ from: location.pathname }} replace />;
  }

  // User is authenticated, render the protected content
  return children;
};

export default ProtectedRoute;
