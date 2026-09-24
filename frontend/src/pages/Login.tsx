import { FormEvent, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { requestMagicLink, verifyMagicLink } from '../api';
import { useAuth } from '../auth';

export default function Login() {
  const { user, loading, refresh } = useAuth();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [debugCode, setDebugCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  const sendCode = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await requestMagicLink(email);
      setSent(true);
      setDebugCode(result.debugCode ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send code');
    } finally {
      setBusy(false);
    }
  };

  const verify = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await verifyMagicLink(email, code.trim());
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not verify code');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <p className="eyebrow">Training Scheduler</p>
        <h1>Sign in</h1>
        <p className="auth-lede">Use your email for a one-time code, or continue with Google.</p>

        {!sent ? (
          <form className="auth-form" onSubmit={sendCode}>
            <label>
              Email
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <button className="btn primary" type="submit" disabled={busy}>
              {busy ? 'Sending…' : 'Email me a code'}
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={verify}>
            <p className="auth-hint">We sent a 6-digit code to {email}.</p>
            {debugCode && <p className="auth-hint">Dev code: {debugCode}</p>}
            <label>
              Code
              <input
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                required
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
            </label>
            <button className="btn primary" type="submit" disabled={busy}>
              {busy ? 'Checking…' : 'Sign in'}
            </button>
            <button
              className="btn ghost"
              type="button"
              onClick={() => {
                setSent(false);
                setCode('');
              }}
            >
              Use a different email
            </button>
          </form>
        )}

        <a className="btn ghost auth-google" href="/api/auth/google">
          Continue with Google
        </a>
        {error && <p className="inline-error">{error}</p>}
      </div>
    </div>
  );
}
