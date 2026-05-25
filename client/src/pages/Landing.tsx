import { useEffect, useState } from 'react';
import type { User } from '../types';

type AuthState =
  | { kind: 'loading' }
  | { kind: 'signed_out' }
  | { kind: 'signed_in'; user: User }
  | { kind: 'error'; message: string };

export function Landing(): JSX.Element {
  const [state, setState] = useState<AuthState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (cancelled) return;
        if (res.status === 200) {
          const body = (await res.json()) as { user: User };
          setState({ kind: 'signed_in', user: body.user });
          return;
        }
        if (res.status === 401) {
          setState({ kind: 'signed_out' });
          return;
        }
        setState({
          kind: 'error',
          message: 'We had trouble checking your sign-in status. Please refresh and try again.',
        });
      } catch {
        if (cancelled) return;
        setState({
          kind: 'error',
          message: 'We could not reach the server. Check your connection and try again.',
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Surface the auth_failed query param (sent by /api/auth/google/callback failure)
  const urlError = new URLSearchParams(window.location.search).get('error');

  async function handleLogout(): Promise<void> {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } finally {
      window.location.reload();
    }
  }

  return (
    <main>
      <h1>Simplidoro</h1>
      {urlError === 'auth_failed' && (
        <p role="alert">Sign-in did not complete. Please try again.</p>
      )}
      {state.kind === 'loading' && <p>Loading…</p>}
      {state.kind === 'signed_out' && (
        <a href="/api/auth/google">Sign in with Google</a>
      )}
      {state.kind === 'signed_in' && (
        <div>
          <p>Logged in as {state.user.display_name}</p>
          <button type="button" onClick={() => void handleLogout()}>
            Log out
          </button>
        </div>
      )}
      {state.kind === 'error' && (
        <div>
          <p role="alert">{state.message}</p>
          <a href="/api/auth/google">Sign in with Google</a>
        </div>
      )}
    </main>
  );
}
