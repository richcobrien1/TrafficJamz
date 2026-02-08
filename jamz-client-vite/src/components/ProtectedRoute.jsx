// src/components/ProtectedRoute.jsx

import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";

const ProtectedRoute = ({ children }) => {
  const { isLoaded, isSignedIn } = useUser();
  const location = useLocation();

  if (!isLoaded) return <div>Loading...</div>;

  // Redirect to login and include the original location in state so we can
  // return the user after successful login/registration.
  return isSignedIn ? children : (
    <Navigate to="/auth/login" state={{ from: location.pathname }} replace />
  );
};

export default ProtectedRoute;
