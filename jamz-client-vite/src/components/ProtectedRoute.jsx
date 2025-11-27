// src/components/ProtectedRoute.jsx

import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Box, CircularProgress, Typography, Button, Paper } from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  // Set timeout if loading takes too long (more than 10 seconds)
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        setLoadingTimeout(true);
      }, 10000);

      return () => clearTimeout(timer);
    } else {
      setLoadingTimeout(false);
    }
  }, [loading]);

  // Show loading spinner with timeout fallback
  if (loading) {
    if (loadingTimeout) {
      // Loading is taking too long - show error message with retry
      return (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            padding: 3
          }}
        >
          <Paper
            elevation={3}
            sx={{
              p: 4,
              textAlign: "center",
              maxWidth: 400,
              backgroundColor: "rgba(255, 255, 255, 0.95)"
            }}
          >
            <LockIcon sx={{ fontSize: 48, color: "warning.main", mb: 2 }} />
            
            <Typography variant="h6" color="text.primary" gutterBottom>
              Connection Taking Longer Than Expected
            </Typography>
            
            <Typography variant="body2" color="text.secondary" paragraph>
              The server might be sleeping or there may be a connection issue.
            </Typography>
            
            <Button
              variant="contained"
              color="primary"
              onClick={() => window.location.reload()}
              sx={{ mt: 2 }}
            >
              Retry Connection
            </Button>
            
            <Button
              variant="text"
              onClick={() => window.location.href = "/auth/login"}
              sx={{ mt: 1, display: "block" }}
            >
              Go to Login
            </Button>
          </Paper>
        </Box>
      );
    }

    // Normal loading state
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
        {user && (
          <Typography variant="caption" sx={{ mt: 1, opacity: 0.8 }}>
            Welcome back, {user.display_name || user.email}
          </Typography>
        )}
      </Box>
    );
  }

  // Redirect to login and include the original location in state so we can
  // return the user after successful login/registration.
  return isAuthenticated ? children : (
    <Navigate to="/auth/login" state={{ from: location.pathname }} replace />
  );
};

export default ProtectedRoute;
