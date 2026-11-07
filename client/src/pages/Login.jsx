import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '../features/toast/ToastContext.jsx';
import { useAuth } from '../features/auth/AuthContext.jsx';
import Field from '../components/Field.jsx';
import Button from '../components/Button.jsx';

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
      toast.success('Signed in successfully');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Invalid email or password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main style={{ maxWidth: '28rem', margin: '4rem auto', padding: '0 1.5rem' }}>
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '2rem',
          boxShadow: 'var(--shadow-warm)',
        }}
      >
        <header style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Sign In to Vault</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Enter your credentials to access your protected documents.
          </p>
        </header>

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
              placeholder="you@domain.com"
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

          <div style={{ marginTop: '1.5rem' }}>
            <Button type="submit" disabled={isSubmitting} style={{ width: '100%' }}>
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </Button>
          </div>
        </form>

        <footer
          style={{
            marginTop: '1.5rem',
            textAlign: 'center',
            fontSize: '0.875rem',
            color: 'var(--text-secondary)',
          }}
        >
          Don&apos;t have an account?{' '}
          <Link to="/register" style={{ fontWeight: 600 }}>
            Create one
          </Link>
        </footer>
      </div>
    </main>
  );
}
