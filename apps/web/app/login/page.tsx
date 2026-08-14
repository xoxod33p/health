'use client';

import { Activity, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from '../../lib/api';

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
      setError(caught instanceof Error ? caught.message : 'Unable to sign in');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <div className="login-brand">
        <div className="brand-mark">
          <Activity size={19} strokeWidth={2.5} />
        </div>
        <span className="brand-name">
          care<span>signal</span>
        </span>
      </div>

      <section className="login-card">
        <div className="login-heading">
          <p className="eyebrow">Protected workspace</p>
          <h1>Welcome back</h1>
          <p>Sign in to manage your healthcare sensor network.</p>
        </div>

        <form onSubmit={submit} className="login-form">
          <label>
            Email address
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              placeholder="Enter your email"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              placeholder="Enter your password"
              required
            />
          </label>

          {error && <div className="form-error">{error}</div>}

          <button className="primary-button login-submit" disabled={submitting}>
            {submitting ? 'Signing in...' : 'Sign in'}
            <ArrowRight size={16} />
          </button>
        </form>
      </section>

      <p className="login-footer">CareSignal · Secure clinical operations</p>
    </main>
  );
}
