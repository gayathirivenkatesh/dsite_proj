import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../api/auth.js';
import { useToast } from '../../features/toast/ToastContext.jsx';
import { useAuth } from '../../features/auth/AuthContext.jsx';
import Field from '../../components/Field.jsx';
import Button from '../../components/Button.jsx';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await authApi.register(form);
      const data = await authApi.login({ email: form.email, password: form.password });
      // set token via login helper
      await login(form.email, form.password);
      toast.success('Account created and logged in');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Registration failed');
    }
  };

  return (
    <section className="container" style={{ maxWidth: '24rem', margin: '2rem auto' }}>
      <h1>Register</h1>
      <form onSubmit={handleSubmit}>
        <Field label="Name" htmlFor="name" error={null}>
          <input type="text" name="name" id="name" required value={form.name} onChange={handleChange} />
        </Field>
        <Field label="Email" htmlFor="email" error={null}>
          <input type="email" name="email" id="email" required value={form.email} onChange={handleChange} />
        </Field>
        <Field label="Password" htmlFor="password" error={null}>
          <input type="password" name="password" id="password" required value={form.password} onChange={handleChange} />
        </Field>
        <Button type="submit">Register</Button>
      </form>
    </section>
  );
}

