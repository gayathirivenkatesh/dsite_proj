import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext.jsx';

/**
 * Guard for admin‑only routes.
 */
export default function RoleRoute({ requiredRole = 'ADMIN', children }) {
  const { isLoading, isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  if (user?.role !== requiredRole) return <Navigate to="/" replace />;
  return <>{children}</>;
}

