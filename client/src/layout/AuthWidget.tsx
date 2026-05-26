import { useEffect, useState } from 'react';
import type { User } from '../types';

type AuthState =
  | { kind: 'loading' }
  | { kind: 'signed_out' }
  | { kind: 'signed_in'; user: User }
  | { kind: 'error'; message: string };

export function AuthWidget(): JSX.Element {
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
        setState({ kind: 'error', message: 'Sign-in status check failed.' });
      } catch {
        if (!cancelled) setState({ kind: 'error', message: 'Server unreachable.' });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function handleLogout(): Promise<void> {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } finally {
      window.location.reload();
    }
  }

  return (
    <div className="text-sm text-text-secondary">
      {state.kind === 'loading' && <span>…</span>}
      {state.kind === 'signed_out' && (
        <a href="/api/auth/google" className="text-accent underline">Sign in with Google</a>
      )}
      {state.kind === 'signed_in' && (
        <span>
          {state.user.display_name}
          {' · '}
          <button onClick={() => void handleLogout()} className="text-accent underline">
            Log out
          </button>
        </span>
      )}
      {state.kind === 'error' && <span className="text-error">{state.message}</span>}
    </div>
  );
}
