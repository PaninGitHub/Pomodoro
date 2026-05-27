import { createContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { User } from '../types';

export type AuthState =
  | { kind: 'loading' }
  | { kind: 'signed_out' }
  | { kind: 'signed_in'; user: User }
  | { kind: 'error'; message: string };

interface AuthContextValue {
  state: AuthState;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [state, setState] = useState<AuthState>({ kind: 'loading' });

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.status === 200) {
        const body = (await res.json()) as { user: User };
        setState({ kind: 'signed_in', user: body.user });
      } else if (res.status === 401) {
        setState({ kind: 'signed_out' });
      } else {
        setState({ kind: 'error', message: 'Sign-in status check failed.' });
      }
    } catch {
      setState({ kind: 'error', message: 'Server unreachable.' });
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } finally {
      window.location.reload();
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  return (
    <AuthContext.Provider value={{ state, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
