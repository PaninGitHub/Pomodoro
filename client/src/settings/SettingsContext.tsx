import { createContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import { useAuth } from '../auth/useAuth';
import { readSettingsCookie, writeSettingsCookie } from '../utils/cookie';
import { DEFAULT_SETTINGS, type Settings, type PartialSettings } from './settingsTypes';

interface SettingsContextValue {
  settings: Settings;
  /**
   * Update one or more settings. Persists to DB (auth) or cookie (guest).
   * For text inputs (custom URL), call with { deferred: true } and persist
   * on blur via a separate call without that flag.
   */
  updateSettings: (patch: PartialSettings, opts?: { deferred?: boolean }) => Promise<void>;
}

export const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }): JSX.Element {
  const { state: authState } = useAuth();
  // Start from cookie if present (covers guest fast-load), fall through to defaults.
  const initialFromCookie = readSettingsCookie();
  const [settings, setSettings] = useState<Settings>({ ...DEFAULT_SETTINGS, ...initialFromCookie });
  const lastAuthKindRef = useRef<string>(authState.kind);

  // Fetch DB settings on transition INTO signed_in (login or initial load).
  useEffect(() => {
    lastAuthKindRef.current = authState.kind;
    if (authState.kind !== 'signed_in') return;
    // Fetch fresh DB settings on any signed_in entry. We always overwrite the
    // cookie with the DB value (per F-30: "DB settings take precedence on login").
    void (async () => {
      try {
        const res = await fetch('/api/settings', { credentials: 'include' });
        if (res.status !== 200) return;
        const body = (await res.json()) as { settings: Settings };
        const dbSettings = { ...DEFAULT_SETTINGS, ...body.settings };
        setSettings(dbSettings);
        writeSettingsCookie(dbSettings);
      } catch {
        // Network failure on settings fetch: keep current state (cookie or defaults).
      }
    })();
  }, [authState.kind, authState.kind === 'signed_in' ? authState.user.id : null]);

  const updateSettings = useCallback(async (patch: PartialSettings, opts?: { deferred?: boolean }) => {
    // Optimistic local update.
    setSettings((prev) => ({ ...prev, ...patch }));

    // Persist:
    // - Auth: PATCH /api/settings (unless deferred, where caller is responsible for the
    //   eventual non-deferred call on blur).
    // - Guest: write the merged settings to cookie.
    if (opts?.deferred) {
      // Deferred path: caller will issue a non-deferred call to persist when ready.
      // Still mirror to cookie locally so guest text input feels responsive.
      const merged = { ...settings, ...patch };
      writeSettingsCookie(merged);
      return;
    }

    if (authState.kind === 'signed_in') {
      try {
        const res = await fetch('/api/settings', {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        });
        if (res.status === 200) {
          const body = (await res.json()) as { settings: Settings };
          const fresh = { ...DEFAULT_SETTINGS, ...body.settings };
          setSettings(fresh);
          writeSettingsCookie(fresh);
        } else {
          // Server rejected; revert local change by re-reading from server.
          // Best effort: do a GET to resync.
          const resync = await fetch('/api/settings', { credentials: 'include' });
          if (resync.status === 200) {
            const body = (await resync.json()) as { settings: Settings };
            setSettings({ ...DEFAULT_SETTINGS, ...body.settings });
          }
        }
      } catch {
        // Network failure: keep local update; cookie still gets written below.
      }
    }

    // Guest path (and always-mirror for auth): keep cookie up to date.
    const merged = { ...settings, ...patch };
    writeSettingsCookie(merged);
  }, [authState, settings]);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}
