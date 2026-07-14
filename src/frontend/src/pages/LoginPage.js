import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('login');
  const [form, setForm] = useState({ email: '', full_name: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login({ email: form.email, password: form.password });
      navigate('/');
    } catch (err) {
      setError(err.detail || err.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await register({ email: form.email, password: form.password, full_name: form.full_name });
      navigate('/onboarding');
    } catch (err) {
      setError(err.detail || err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--background)]">
      {/* Background light leaks */}
      <div className="light-leak light-leak-1" />
      <div className="light-leak light-leak-2" />

      {/* Decorative film strip pattern */}
      <div className="absolute bottom-0 right-0 top-0 z-[1] hidden w-1/2 bg-[linear-gradient(to_left,rgba(14,14,14,0)_0%,rgba(14,14,14,1)_100%)] lg:block" />
      <div className="absolute bottom-0 right-0 top-0 hidden w-1/2 bg-[repeating-linear-gradient(0deg,transparent,transparent_80px,rgba(255,255,255,0.02)_80px,rgba(255,255,255,0.02)_82px)] lg:block" />

      {/* Form Card */}
      <div className="fade-in relative z-10 m-6 w-full max-w-[440px]">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="font-display text-[2rem] font-extrabold tracking-[-0.03em] text-[var(--primary)]">
            ◈ The Curator
          </div>
          <div className="body-md mt-1">Premium Screening · Personalized Cinema</div>
        </div>

        {/* Tab switcher */}
        <div className="mb-6 flex rounded-[var(--radius-xl)] bg-[var(--surface-container)] p-1">
          {['login', 'register'].map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(''); }}
              className={`flex-1 rounded-[calc(var(--radius-xl)-4px)] px-4 py-3 text-[0.9375rem] font-semibold transition ${tab === t ? 'bg-[var(--surface-container-highest)] text-[var(--on-surface)] shadow-[0_2px_8px_rgba(0,0,0,0.3)]' : 'text-[var(--on-surface-variant)]'}`}
            >
              {t === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        {/* Form */}
        <div className="rounded-[var(--radius-xl)] border border-[rgba(73,72,71,0.4)] bg-[rgba(26,25,25,0.8)] p-8 backdrop-blur-[20px]">
          <form onSubmit={tab === 'login' ? handleLogin : handleRegister}>
            <div className="mb-4">
              <label className="mb-2 block text-[0.8125rem] font-medium text-[var(--on-surface-variant)]">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                className="input-field"
                placeholder="your@email.com"
                required
              />
            </div>

            {tab === 'register' && (
              <div className="mb-4">
                <label className="mb-2 block text-[0.8125rem] font-medium text-[var(--on-surface-variant)]">
                  Full Name
                </label>
                <input
                  id="full_name"
                  name="full_name"
                  type="text"
                  value={form.full_name}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Enter your full name"
                  required
                />
              </div>
            )}

            <div className={tab === 'register' ? 'mb-4' : 'mb-6'}>
              <label className="mb-2 block text-[0.8125rem] font-medium text-[var(--on-surface-variant)]">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                className="input-field"
                placeholder="••••••••"
                required
              />
            </div>

            {tab === 'register' && (
              <div className="mb-6">
                <label className="mb-2 block text-[0.8125rem] font-medium text-[var(--on-surface-variant)]">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="••••••••"
                  required
                />
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mb-4 rounded-[var(--radius-md)] border border-[rgba(255,115,81,0.3)] bg-[rgba(255,115,81,0.1)] px-4 py-3 text-[0.875rem] text-[var(--error)]">
                {error}
              </div>
            )}

            <button
              type="submit"
              id={tab === 'login' ? 'btn-login' : 'btn-register'}
              disabled={loading}
              className={`btn btn-primary w-full justify-center ${loading ? 'opacity-70' : ''}`}
            >
              {loading ? '...' : tab === 'login' ? 'Enter the Cinema' : 'Create Account'}
            </button>
          </form>

          {tab === 'login' && (
            <p className="mt-4 text-center text-[0.875rem] text-[var(--on-surface-variant)]">
              New here?{' '}
              <button onClick={() => setTab('register')} className="border-none bg-transparent font-semibold text-[var(--primary)]">
                Create a free account
              </button>
            </p>
          )}
        </div>

        <p className="mt-6 text-center text-[0.75rem] text-[var(--outline)]">
          By continuing, you agree to our{' '}
          <Link to="/terms" className="text-[var(--on-surface-variant)]">Terms of Service</Link>
          {' '}and{' '}
          <Link to="/privacy" className="text-[var(--on-surface-variant)]">Privacy Policy</Link>
        </p>
      </div>
    </div>
  );
}
