import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '../features/toast/ToastContext.jsx';
import { useAuth } from '../features/auth/AuthContext.jsx';
import Field from '../components/Field.jsx';
import Button from '../components/Button.jsx';
import Navbar from '../components/Navbar.jsx';
import { PostLockKeyIllustration } from '../components/PostRoomIcons.jsx';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) {
      toast.error('Passwords need at least 8 characters to stay secure.');
      return;
    }

    setIsSubmitting(true);
    try {
      await register(form.name, form.email, form.password);
      toast.success('Your vault is ready.');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message || 'We could not set up your vault right now.');
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
              Start your vault
            </h1>
            <p
              style={{
                color: 'var(--text-secondary)',
                fontSize: '1rem',
                lineHeight: 1.6,
                marginBottom: '1.5rem',
              }}
            >
              Your personal post room. Keep private documents in encrypted storage, and generate
              expiring keys whenever you need to share.
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
              Argon2 password protection. Full audit history.
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
              <Field label="Your Name (Optional)" htmlFor="name">
                <input
                  type="text"
                  name="name"
                  id="name"
                  autoComplete="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="e.g. Eleanor Vance"
                />
              </Field>

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
                  autoComplete="new-password"
                  minLength={8}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="At least 8 characters"
                />
              </Field>

              <div style={{ marginTop: '2rem' }}>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  variant="primary"
                  style={{ width: '100%' }}
                >
                  {isSubmitting ? 'Preparing vault...' : 'Create Vault'}
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
              Already have a vault?{' '}
              <Link
                to="/login"
                style={{
                  color: 'var(--accent)',
                  fontWeight: 600,
                  textDecoration: 'underline',
                }}
              >
                Sign In
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
