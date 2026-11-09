import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext.jsx';
import Button from '../components/Button.jsx';
import Navbar from '../components/Navbar.jsx';
import { PostLockKeyIllustration, KeyIcon, LockIcon } from '../components/PostRoomIcons.jsx';

export default function HomePage() {
  const { isAuthenticated, user } = useAuth();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <main
        style={{
          flex: 1,
          maxWidth: '68rem',
          margin: '0 auto',
          padding: '4rem 1.5rem',
          width: '100%',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
            gap: '4rem',
            alignItems: 'start',
          }}
          className="editorial-grid"
        >
          {/* Editorial column */}
          <div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.8125rem',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--accent)',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <span>The Post Room</span>
              <span>•</span>
              <span>Dispatches & Vault</span>
            </div>

            <h1
              style={{
                fontSize: 'clamp(2.25rem, 4vw, 3.25rem)',
                lineHeight: 1.15,
                marginBottom: '1.5rem',
                fontFamily: 'var(--font-serif)',
                fontWeight: 700,
                color: 'var(--text-primary)',
              }}
            >
              Keep a document safe.
              <br />
              Hand someone a key.
            </h1>

            <p
              style={{
                color: 'var(--text-secondary)',
                fontSize: '1.125rem',
                lineHeight: 1.65,
                marginBottom: '2rem',
                maxWidth: '56ch',
              }}
            >
              When you leave a file here, you set the terms: how many times the key may be used,
              when it runs out, and whether it requires a sealed password. Once fulfilled, the lock
              shuts permanently.
            </p>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                flexWrap: 'wrap',
                marginBottom: '3rem',
              }}
            >
              {isAuthenticated ? (
                <Link to="/dashboard" style={{ textDecoration: 'none' }}>
                  <Button variant="primary">Open Your Vault ({user?.name || user?.email})</Button>
                </Link>
              ) : (
                <>
                  <Link to="/register" style={{ textDecoration: 'none' }}>
                    <Button variant="primary">Start Your Vault</Button>
                  </Link>
                  <Link to="/login" style={{ textDecoration: 'none' }}>
                    <Button variant="secondary">Sign In</Button>
                  </Link>
                </>
              )}
            </div>

            {/* Ruled ledger principles */}
            <div
              style={{
                borderTop: '1px solid var(--border-subtle)',
                paddingTop: '2rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
                maxWidth: '58ch',
              }}
            >
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--accent)', marginTop: '0.2rem', flexShrink: 0 }}>
                  <KeyIcon size={18} />
                </span>
                <div>
                  <h3 style={{ fontSize: '1.05rem', marginBottom: '0.25rem' }}>
                    Race-safe download counts
                  </h3>
                  <p style={{ fontSize: '0.925rem', color: 'var(--text-secondary)' }}>
                    If a key is good for three downloads, three copies are served. Concurrent races
                    are checked atomically on the server—no duplicate handoffs.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--accent)', marginTop: '0.2rem', flexShrink: 0 }}>
                  <LockIcon size={18} />
                </span>
                <div>
                  <h3 style={{ fontSize: '1.05rem', marginBottom: '0.25rem' }}>
                    Argon2 password locks
                  </h3>
                  <p style={{ fontSize: '0.925rem', color: 'var(--text-secondary)' }}>
                    File contents and metadata remain sealed until unlocked with the correct phrase.
                    Five failed tries lockout the sender&apos;s key for fifteen minutes.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right column: tactile stationer note illustration */}
          <div
            style={{
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 'var(--radius-md)',
              padding: '2.5rem 2rem',
              position: 'relative',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                color: 'var(--accent)',
                marginBottom: '1.5rem',
              }}
            >
              <PostLockKeyIllustration size={88} />
            </div>

            <div
              style={{
                borderTop: '1px dashed var(--border-strong)',
                paddingTop: '1.25rem',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.8125rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.7,
              }}
            >
              <div
                style={{
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  marginBottom: '0.5rem',
                  fontFamily: 'var(--font-serif)',
                  fontSize: '1rem',
                }}
              >
                Stationery Note
              </div>
              <div>• Recipients never need an account.</div>
              <div>• No tracker pixels, no decorative analytics.</div>
              <div>• The owner sees who opened the file and when.</div>
              <div>• Revoke any key with a single decision.</div>
            </div>
          </div>
        </div>
      </main>

      <style>{`
        @media (max-width: 768px) {
          .editorial-grid {
            grid-template-columns: 1fr !important;
            gap: 2.5rem !important;
          }
        }
      `}</style>
    </div>
  );
}
