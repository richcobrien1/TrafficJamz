// src/components/ProtectedRoute.jsx

import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import { Box, CircularProgress, Typography } from "@mui/material";

const ProtectedRoute = ({ children }) => {
  const { isLoaded, isSignedIn } = useClerkAuth();
  const location = useLocation();

  // Show loading spinner while Clerk authentication state is loading
  if (!isLoaded) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white"
        }}
      >
        <CircularProgress size={60} sx={{ color: "white", mb: 2 }} />
        <Typography variant="h6">Loading...</Typography>
      </Box>
    );
  }

  // Redirect to login if not signed in, save original location to redirect back after login
  if (!isSignedIn) {
    return <Navigate to="/auth/login" state={{ from: location.pathname }} replace />;
  }

  // User is authenticated, render the protected content
  return children;
};

export default ProtectedRoute;
