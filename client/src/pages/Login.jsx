import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '../features/toast/ToastContext.jsx';
import { useAuth } from '../features/auth/AuthContext.jsx';
import Field from '../components/Field.jsx';
import Button from '../components/Button.jsx';
import Navbar from '../components/Navbar.jsx';
import { PostLockKeyIllustration } from '../components/PostRoomIcons.jsx';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back to your vault.');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message || 'The email and password provided do not match our vault records.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <main
        style={{
          flex: 1,
          maxWidth: '56rem',
          margin: '0 auto',
          padding: '4rem 1.5rem',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 1.2fr)',
            gap: '3.5rem',
            width: '100%',
            alignItems: 'center',
          }}
          className="auth-split-grid"
        >
          {/* Left calm brand column */}
          <div style={{ paddingRight: '1rem' }}>
            <div style={{ color: 'var(--accent)', marginBottom: '1.5rem' }}>
              <PostLockKeyIllustration size={68} />
            </div>
            <h1
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '2rem',
                lineHeight: 1.2,
                marginBottom: '1rem',
              }}
            >
              Enter the Post Room
            </h1>
            <p
              style={{
                color: 'var(--text-secondary)',
                fontSize: '1rem',
                lineHeight: 1.6,
                marginBottom: '1.5rem',
              }}
            >
              Provide the credentials for your personal vault to view kept files, hand out keys, or
              inspect your dispatch ledger.
            </p>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.8125rem',
                color: 'var(--text-secondary)',
                borderTop: '1px solid var(--border-subtle)',
                paddingTop: '1rem',
              }}
            >
              Quiet storage. No advertising, no social logins.
            </div>
          </div>

          {/* Right plain form column */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '2.5rem 2rem',
            }}
          >
            <form onSubmit={handleSubmit}>
              <Field label="Email Address" htmlFor="email">
                <input
                  type="email"
                  name="email"
                  id="email"
                  required
                  autoComplete="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="name@example.com"
                />
              </Field>

              <Field label="Password" htmlFor="password">
                <input
                  type="password"
                  name="password"
                  id="password"
                  required
                  autoComplete="current-password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                />
              </Field>

              <div style={{ marginTop: '2rem' }}>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  variant="primary"
                  style={{ width: '100%' }}
                >
                  {isSubmitting ? 'Opening vault...' : 'Open Vault'}
                </Button>
              </div>
            </form>

            <footer
              style={{
                marginTop: '1.5rem',
                paddingTop: '1.25rem',
                borderTop: '1px solid var(--border-subtle)',
                textAlign: 'center',
                fontSize: '0.875rem',
                color: 'var(--text-secondary)',
              }}
            >
              Don&apos;t have a vault yet?{' '}
              <Link
                to="/register"
                style={{
                  color: 'var(--accent)',
                  fontWeight: 600,
                  textDecoration: 'underline',
                }}
              >
                Create an account
              </Link>
            </footer>
          </div>
        </div>
      </main>

      <style>{`
        @media (max-width: 768px) {
          .auth-split-grid {
            grid-template-columns: 1fr !important;
            gap: 2rem !important;
          }
        }
      `}</style>
    </div>
  );
}
