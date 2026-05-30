import { useAuth } from '../auth/useAuth';
import { useSettings } from '../settings/useSettings';

export function AuthWidget(): JSX.Element {
  const { state, logout } = useAuth();
  const { settings } = useSettings();

  return (
    <div className="text-sm text-text-secondary flex items-center gap-2">
      {state.kind === 'loading' && <span>…</span>}
      {state.kind === 'signed_out' && (
        <a href="/api/auth/google" className="text-accent underline">Sign in with Google</a>
      )}
      {state.kind === 'signed_in' && (
        <>
          {settings.show_avatar && state.user.avatar_url && (
            <img
              src={state.user.avatar_url}
              alt=""
              referrerPolicy="no-referrer"
              className="w-7 h-7 rounded-full border border-border"
            />
          )}
          <span>
            {state.user.display_name}
            {' · '}
            <button onClick={() => void logout()} className="text-accent underline">Log out</button>
          </span>
        </>
      )}
      {state.kind === 'error' && <span className="text-error">{state.message}</span>}
    </div>
  );
}
