import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext.jsx';
import { useToast } from '../features/toast/ToastContext.jsx';
import Button from './Button.jsx';
import StatusPill from './StatusPill.jsx';

export default function Navbar() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      toast.info('Signed out');
      navigate('/login');
    } catch {
      navigate('/login');
    }
  };

  return (
    <header
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '0.75rem 1.5rem',
      }}
    >
      <div
        style={{
          maxWidth: '64rem',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            textDecoration: 'none',
            color: 'var(--text-primary)',
            fontWeight: 700,
            fontSize: '1.125rem',
          }}
        >
          {/* Custom SVG Vault / Key Motif */}
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            <circle cx="12" cy="16" r="1.5" />
          </svg>
          <span>Vault</span>
        </Link>

        <nav style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {isAuthenticated ? (
            <>
              <Link
                to="/dashboard"
                style={{
                  color: 'var(--text-primary)',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                }}
              >
                My Files
              </Link>

              {isAdmin && (
                <Link
                  to="/admin"
                  style={{
                    color: 'var(--accent)',
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                  }}
                >
                  Admin Console
                </Link>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  {user?.name}
                </span>
                {isAdmin && <StatusPill status="active">Admin</StatusPill>}
              </div>

              <Button
                onClick={handleLogout}
                style={{
                  padding: '0.25rem 0.75rem',
                  fontSize: '0.8125rem',
                  backgroundColor: 'transparent',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                }}
              >
                Sign Out
              </Button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                style={{
                  color: 'var(--text-primary)',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                }}
              >
                Sign In
              </Link>
              <Link
                to="/register"
                style={{
                  color: 'var(--accent)',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                }}
              >
                Register
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
