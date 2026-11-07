import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext.jsx';

/**
 * Guard for routes that require an authenticated user.
 * If the auth state is still loading, we could render a spinner –
 * for simplicity we just render null (router will render nothing) –
 * the parent layout can show a global spinner if desired.
 */
export default function ProtectedRoute({ children }) {
  const { isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isLoading) return null; // could replace with <Spinner />
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}

