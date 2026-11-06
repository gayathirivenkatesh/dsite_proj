import { Routes, Route } from 'react-router-dom';
import HomePage from '../pages/HomePage.jsx';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route
        path="*"
        element={
          <div style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
            <h1>Page not found</h1>
            <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>
              The page you are looking for does not exist or has been moved.
            </p>
          </div>
        }
      />
    </Routes>
  );
}
