// src/components/ProtectedRoute.jsx

import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div>Loading...</div>;

  // Redirect to login and include the original location in state so we can
  // return the user after successful login/registration.
  return isAuthenticated ? children : (
    <Navigate to="/auth/login" state={{ from: location.pathname }} replace />
  );
};

export default ProtectedRoute;
