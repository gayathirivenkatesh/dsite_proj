import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import HomePage from '../pages/HomePage.jsx';
import LoginPage from '../pages/Login.jsx';
import RegisterPage from '../pages/Register.jsx';
import Dashboard from '../pages/Dashboard.jsx';
import PublicDownload from '../pages/PublicDownload.jsx';
import AdminDashboard from '../pages/AdminDashboard.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';
import RoleRoute from './RoleRoute.jsx';

function LinkRedirect() {
  const { token } = useParams();
  return <Navigate to={`/share/${token}`} replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/share/:token" element={<PublicDownload />} />
      <Route path="/links/:token" element={<LinkRedirect />} />

      {/* Authenticated routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* Admin console */}
      <Route
        path="/admin"
        element={
          <RoleRoute requiredRole="ADMIN">
            <AdminDashboard />
          </RoleRoute>
        }
      />

      {/* Catch-all 404 */}
      <Route
        path="*"
        element={
          <div style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
            <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Page Not Found</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              The page you are looking for does not exist or has been moved.
            </p>
            <a href="/" style={{ color: 'var(--accent)', fontWeight: 600 }}>
              Return to Vault Home
            </a>
          </div>
        }
      />
    </Routes>
  );
}
