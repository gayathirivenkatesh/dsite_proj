import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext.jsx';
import { useToast } from '../features/toast/ToastContext.jsx';
import Button from './Button.jsx';
import StatusStamp from './StatusPill.jsx';
import { PostBoxIcon } from './PostRoomIcons.jsx';

export default function Navbar() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('postroom-theme') || 'system';
  });

  useEffect(() => {
    if (theme === 'system') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
    localStorage.setItem('postroom-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

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
        padding: '0.875rem 1.5rem',
      }}
    >
      <div
        style={{
          maxWidth: '68rem',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.625rem',
            textDecoration: 'none',
            color: 'var(--text-primary)',
          }}
        >
          <span style={{ color: 'var(--accent)' }}>
            <PostBoxIcon size={22} />
          </span>
          <span
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.25rem',
              fontWeight: 700,
              letterSpacing: '-0.02em',
            }}
          >
            The Post Room
          </span>
          <span
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              borderLeft: '1px solid var(--border-strong)',
              paddingLeft: '0.5rem',
            }}
          >
            Vault
          </span>
        </Link>

        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            onClick={toggleTheme}
            style={{
              background: 'none',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.35rem 0.65rem',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              minHeight: '36px',
            }}
            title="Toggle stationery light / charcoal dark theme"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? 'Stationery' : 'Charcoal'}
          </button>

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
                Vault Ledger
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
                  Postmaster Audit
                </Link>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span
                  style={{
                    fontSize: '0.8125rem',
                    color: 'var(--text-secondary)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {user?.name || user?.email}
                </span>
                {isAdmin && <StatusStamp status="active">Postmaster</StatusStamp>}
              </div>

              <Button
                variant="secondary"
                onClick={handleLogout}
                style={{
                  minHeight: '36px',
                  padding: '0.25rem 0.75rem',
                  fontSize: '0.8125rem',
                }}
              >
                Leave
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
              <Link to="/register" style={{ textDecoration: 'none' }}>
                <Button
                  variant="primary"
                  style={{
                    minHeight: '36px',
                    padding: '0.25rem 0.875rem',
                    fontSize: '0.8125rem',
                  }}
                >
                  Create Vault
                </Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
