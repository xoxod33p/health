'use client';

import { Activity, ArrowRight, Lock, Mail } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from '../../lib/api';
import { ThemeToggle } from '../components/theme-toggle';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const result = await signIn(email, password);
      if (result.error) throw result.error;
      router.replace('/');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Invalid email or password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 10 }}>
        <ThemeToggle variant="icon" />
      </div>

      <div className="login-container">
        <div className="login-brand">
          <div className="brand-mark">
            <Activity size={22} strokeWidth={2.5} />
          </div>
          <span className="brand-name">
            care<span>signal</span>
          </span>
        </div>

        <section className="login-card">
          <div className="login-heading">
            <p className="eyebrow">Protected Workspace</p>
            <h1>Welcome back</h1>
            <p className="login-subtitle">Sign in to manage your healthcare telemetry and sensor network.</p>
          </div>

          <form onSubmit={submit} className="login-form">
            <label>
              <span>Email address</span>
              <div className="input-with-icon">
                <Mail size={16} className="input-icon" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </label>

            <label>
              <span>Password</span>
              <div className="input-with-icon">
                <Lock size={16} className="input-icon" />
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
            </label>

            {error && <div className="form-error">{error}</div>}

            <button type="submit" className="primary-button login-submit" disabled={submitting}>
              {submitting ? 'Signing in...' : 'Sign in'}
              <ArrowRight size={16} />
            </button>
          </form>
        </section>

        <p className="login-footer">CareSignal Platform · Secure Clinical Operations</p>
      </div>
    </main>
  );
}
