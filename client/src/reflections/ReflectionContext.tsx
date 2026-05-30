import { createContext, useCallback, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '../auth/useAuth';
import { DEFAULT_PROMPTS, type PromptKey } from '../config/reflection-prompts.config';

export type PromptsMap = Record<PromptKey, string>;

interface ReflectionContextValue {
  prompts: PromptsMap;
  refresh: () => Promise<void>;
}

export const ReflectionContext = createContext<ReflectionContextValue | null>(null);

export function ReflectionPromptsProvider({ children }: { children: ReactNode }): JSX.Element {
  const { state: authState } = useAuth();
  // Synchronous defaults so the first render of any consumer (e.g.
  // ReflectionModal) already has full prompt text — avoids a one-frame
  // flash of empty / placeholder copy.
  const [prompts, setPrompts] = useState<PromptsMap>({ ...DEFAULT_PROMPTS });

  const refresh = useCallback(async () => {
    if (authState.kind !== 'signed_in') {
      setPrompts({ ...DEFAULT_PROMPTS });
      return;
    }
    try {
      const res = await fetch('/api/prompts', { credentials: 'include' });
      if (res.status === 200) {
        const body = (await res.json()) as { prompts: Partial<PromptsMap> };
        // Merge order: defaults underneath, DB on top so any missing keys
        // fall back to the config default rather than rendering undefined.
        setPrompts({ ...DEFAULT_PROMPTS, ...body.prompts });
      }
      // 401 / other: keep current map (defaults or last successful fetch).
    } catch {
      // Network failure: same — keep current map.
    }
  }, [authState]);

  useEffect(() => {
    // Cancelled-flag guard against an auth state change mid-fetch:
    // if the user signs out while a signed_in GET is in flight, the
    // late setPrompts would otherwise leak the prior user's text into
    // the signed-out state for one render.
    let cancelled = false;
    void (async () => {
      if (authState.kind !== 'signed_in') {
        if (!cancelled) setPrompts({ ...DEFAULT_PROMPTS });
        return;
      }
      try {
        const res = await fetch('/api/prompts', { credentials: 'include' });
        if (cancelled) return;
        if (res.status === 200) {
          const body = (await res.json()) as { prompts: Partial<PromptsMap> };
          if (!cancelled) setPrompts({ ...DEFAULT_PROMPTS, ...body.prompts });
        }
      } catch {
        // Network failure: keep current map.
      }
    })();
    return () => { cancelled = true; };
  }, [authState]);

  return (
    <ReflectionContext.Provider value={{ prompts, refresh }}>
      {children}
    </ReflectionContext.Provider>
  );
}
