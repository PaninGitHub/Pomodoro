import { useAuth } from '../auth/useAuth';

export function AuthWidget(): JSX.Element {
  const { state, logout } = useAuth();

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
          <button onClick={() => void logout()} className="text-accent underline">Log out</button>
        </span>
      )}
      {state.kind === 'error' && <span className="text-error">{state.message}</span>}
    </div>
  );
}
