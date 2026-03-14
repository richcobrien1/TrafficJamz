// src/components/ProtectedRoute.jsx

import React, { useRef, useState, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import pLog from '../utils/persistentLogger';

const ProtectedRoute = ({ children }) => {
  const { isLoaded, isSignedIn } = useClerkAuth();
  const location = useLocation();
  const hasRenderedPath = useRef('');

  // Check if we already have backend token (indicates user was recently authenticated)
  const hasToken = !!localStorage.getItem('token');

  // Chrome iOS fix: Add grace period when tokens exist but Clerk not signed in
  const [waitingForClerk, setWaitingForClerk] = useState(false);
  const gracePeriodRef = useRef(null);

  // Only log once per unique state change to avoid spam
  const stateKey = `${isLoaded}-${isSignedIn}-${hasToken}-${location.pathname}`;
  const lastStateKey = useRef('');
  
  if (stateKey !== lastStateKey.current) {
    pLog.log('🔒 ProtectedRoute check:', { 
      isLoaded, 
      isSignedIn, 
      hasToken, 
      path: location.pathname,
      waitingForClerk,
      renderCount: (lastStateKey.current.match(/true/g) || []).length
    });
    lastStateKey.current = stateKey;
  }

  // CRITICAL FIX: Wait for Clerk to load before rendering children
  // Even if we have a token, rendering children before Clerk loads causes re-renders
  // when Clerk's state changes from isLoaded:false to isLoaded:true
  if (!isLoaded) {
    pLog.log('⏳ ProtectedRoute: Waiting for Clerk (hasToken=' + hasToken + ')');
    return null; // Return nothing - prevents multiple renders
  }

  // Chrome iOS Race Condition Fix: If we have tokens but Clerk says not signed in,
  // give Clerk 2 more seconds to sync before redirecting (prevents MFA redirect loop)
  useEffect(() => {
    if (isLoaded && !isSignedIn && hasToken && !waitingForClerk) {
      pLog.log('⏳ ProtectedRoute: Token exists but Clerk not signed in - starting grace period (2s)');
      setWaitingForClerk(true);
      
      gracePeriodRef.current = setTimeout(() => {
        pLog.log('⏱️ ProtectedRoute: Grace period expired, will redirect if still not signed in');
        setWaitingForClerk(false);
      }, 2000); // 2 second grace period for Chrome iOS
    }

    // Clean up timeout if component unmounts or state changes
    return () => {
      if (gracePeriodRef.current) {
        clearTimeout(gracePeriodRef.current);
        gracePeriodRef.current = null;
      }
    };
  }, [isLoaded, isSignedIn, hasToken]);

  // If we're in the grace period, show nothing (waiting for Clerk to catch up)
  if (waitingForClerk) {
    pLog.log('⏳ ProtectedRoute: In grace period, waiting for Clerk to sync...');
    return null;
  }

  // Redirect to login if not signed in, save original location to redirect back after login
  if (!isSignedIn) {
    pLog.log('🚫 ProtectedRoute: Not signed in, NAVIGATING TO /auth/login (from: ' + location.pathname + ')');
    return <Navigate to="/auth/login" state={{ from: location.pathname }} replace />;
  }

  // Only log the first render for this path
  if (hasRenderedPath.current !== location.pathname) {
    pLog.log('✅ ProtectedRoute: Rendering protected content for ' + location.pathname);
    hasRenderedPath.current = location.pathname;
  }
  
  return children;
};

export default ProtectedRoute;
