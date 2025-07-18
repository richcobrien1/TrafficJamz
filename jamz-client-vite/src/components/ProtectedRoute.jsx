// src/components/ProtectedRoute.jsx

import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, role, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  if (!isAuthenticated) return <Navigate to="/auth/login" />;
  if (allowedRoles.length && !allowedRoles.includes(role)) return <Navigate to="/dashboard" />;

  return children;
};

export default ProtectedRoute;
