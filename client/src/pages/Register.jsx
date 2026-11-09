import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '../features/toast/ToastContext.jsx';
import { useAuth } from '../features/auth/AuthContext.jsx';
import Field from '../components/Field.jsx';
import Button from '../components/Button.jsx';

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
      toast.error('Password must be at least 8 characters long');
      return;
    }

    setIsSubmitting(true);
    try {
      await register(form.name, form.email, form.password);
      toast.success('Account created successfully');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Registration failed');
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
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Create Account</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Set up your secure vault for private file storage and sharing.
          </p>
        </header>

        <form onSubmit={handleSubmit}>
          <Field label="Full Name" htmlFor="name">
            <input
              type="text"
              name="name"
              id="name"
              required
              autoComplete="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Alex Johnson"
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
              placeholder="alex@example.com"
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
              placeholder="Minimum 8 characters"
            />
          </Field>

          <div style={{ marginTop: '1.5rem' }}>
            <Button type="submit" disabled={isSubmitting} style={{ width: '100%' }}>
              {isSubmitting ? 'Creating account...' : 'Create Account'}
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
          Already have an account?{' '}
          <Link to="/login" style={{ fontWeight: 600 }}>
            Sign in
          </Link>
        </footer>
      </div>
    </main>
  );
}
