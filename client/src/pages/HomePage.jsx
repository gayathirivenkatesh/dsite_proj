import { Link } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext.jsx';
import Button from '../components/Button.jsx';
import Navbar from '../components/Navbar.jsx';

export default function HomePage() {
  const { isAuthenticated, user } = useAuth();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <main
        style={{
          flex: 1,
          maxWidth: '720px',
          margin: '0 auto',
          padding: '4rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '2rem',
          textAlign: 'center',
        }}
      >
        <header>
          <div
            style={{
              width: '64px',
              height: '64px',
              margin: '0 auto 1.5rem',
              borderRadius: '50%',
              backgroundColor: 'var(--accent-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent)',
            }}
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              <circle cx="12" cy="16" r="1.5" />
            </svg>
          </div>

          <span
            style={{
              display: 'inline-block',
              fontSize: '0.875rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--accent)',
              fontWeight: 600,
              marginBottom: '0.75rem',
            }}
          >
            Cryptographic Storage & Sharing
          </span>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', lineHeight: 1.2 }}>
            Keep what matters safe. Hand the key to who you choose.
          </h1>
          <p
            style={{
              color: 'var(--text-secondary)',
              fontSize: '1.125rem',
              maxWidth: '580px',
              margin: '0 auto',
            }}
          >
            Self-expiring, password-protected links with race-safe download limits and an immutable,
            transparent access history.
          </p>
        </header>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1rem' }}>
          {isAuthenticated ? (
            <Link to="/dashboard">
              <Button style={{ padding: '0.75rem 2rem', fontSize: '1rem' }}>
                Open Your Vault ({user?.name})
              </Button>
            </Link>
          ) : (
            <>
              <Link to="/register">
                <Button style={{ padding: '0.75rem 2rem', fontSize: '1rem' }}>
                  Create Vault Account
                </Button>
              </Link>
              <Link to="/login">
                <Button
                  style={{
                    padding: '0.75rem 2rem',
                    fontSize: '1rem',
                    backgroundColor: 'transparent',
                    border: '1px solid var(--border-strong)',
                    color: 'var(--text-primary)',
                  }}
                >
                  Sign In
                </Button>
              </Link>
            </>
          )}
        </div>

        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1.25rem',
            marginTop: '2rem',
            textAlign: 'left',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '1.5rem',
            }}
          >
            <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>Atomic Expiry</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Server-enforced count and time bounds using single atomic operations. Concurrency-safe
              under load.
            </p>
          </div>

          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '1.5rem',
            }}
          >
            <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>Password Locked</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Argon2 protected links with brute-force rate limiting and automated IP lockouts.
            </p>
          </div>

          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '1.5rem',
            }}
          >
            <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>Full Audit Trail</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Every access attempt—successes, password failures, or expirations—is recorded for
              transparency.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
