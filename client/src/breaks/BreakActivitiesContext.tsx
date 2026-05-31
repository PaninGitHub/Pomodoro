// Provider for break activities. Owns the list state + CRUD + reorder
// methods. Shape and persistence rules deliberately mirror TasksContext:
//   - auth path: GET on auth/load, POST/PATCH/DELETE on mutation
//   - guest path: sessionStorage with the same "don't clobber initial load"
//     guard via hasLoadedRef
// Limit enforcement is server-side (settings.break_activity_limit); the
// client surfaces the limit via useSettings on the page (UX gating), not
// here, because the limit is per-user.

import { createContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import { useAuth } from '../auth/useAuth';
import type { ClientBreakActivity } from './breakTypes';

const SESSION_KEY = 'simplidoro.breakActivities';

interface BreakActivitiesContextValue {
  activities: ClientBreakActivity[];
  addActivity: (name: string, timeEstimate: number) => Promise<{ ok: boolean; error?: string }>;
  updateActivity: (id: string, patch: Partial<Pick<ClientBreakActivity, 'name' | 'time_estimate'>>) => Promise<void>;
  deleteActivity: (id: string) => Promise<void>;
  reorderActivities: (orderedIds: string[]) => Promise<void>;
}

export const BreakActivitiesContext = createContext<BreakActivitiesContextValue | null>(null);

function readGuestActivities(): ClientBreakActivity[] {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as ClientBreakActivity[];
  } catch {
    return [];
  }
}

function writeGuestActivities(rows: ClientBreakActivity[]): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(rows));
  } catch {
    /* swallow quota errors; not fatal */
  }
}

function randomGuestId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return (crypto as Crypto).randomUUID();
  }
  return `guest-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function BreakActivitiesProvider({ children }: { children: ReactNode }): JSX.Element {
  const { state: authState } = useAuth();
  const [activities, setActivities] = useState<ClientBreakActivity[]>([]);
  // See TasksContext for rationale: gate guest-write effect so the initial
  // empty React state doesn't clobber prior sessionStorage on mount.
  const hasLoadedRef = useRef(false);

  const isAuth = authState.kind === 'signed_in';

  // Initial / auth-transition load.
  useEffect(() => {
    if (authState.kind === 'loading') return;
    if (authState.kind === 'signed_in') {
      void (async () => {
        try {
          const res = await fetch('/api/activities', { credentials: 'include' });
          if (res.status === 200) {
            const body = (await res.json()) as { activities: ClientBreakActivity[] };
            setActivities(body.activities);
          } else {
            setActivities([]);
          }
        } catch {
          setActivities([]);
        } finally {
          hasLoadedRef.current = true;
        }
      })();
    } else {
      setActivities(readGuestActivities());
      hasLoadedRef.current = true;
    }
  }, [authState.kind, authState.kind === 'signed_in' ? authState.user.id : null]);

  // Mirror to sessionStorage for guests after initial load.
  useEffect(() => {
    if (!hasLoadedRef.current) return;
    if (!isAuth) writeGuestActivities(activities);
  }, [activities, isAuth]);

  const addActivity = useCallback(async (name: string, time_estimate: number) => {
    // Optimistic append. Auth path replaces temp row with the server's
    // row on 201, or rolls back on failure.
    const tempId = randomGuestId();
    const optimistic: ClientBreakActivity = {
      id: tempId,
      name: name.trim(),
      time_estimate,
      sort_order: activities.length,
    };
    setActivities((prev) => [...prev, optimistic]);

    if (!isAuth) return { ok: true };

    try {
      const res = await fetch('/api/activities', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, time_estimate }),
      });
      if (res.status !== 201) {
        setActivities((prev) => prev.filter((a) => a.id !== tempId));
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        return { ok: false, error: body.error ?? 'Could not save activity.' };
      }
      const body = (await res.json()) as { activity: ClientBreakActivity };
      setActivities((prev) => prev.map((a) => (a.id === tempId ? body.activity : a)));
      return { ok: true };
    } catch {
      setActivities((prev) => prev.filter((a) => a.id !== tempId));
      return { ok: false, error: 'Server unreachable.' };
    }
  }, [isAuth, activities.length]);

  const updateActivity = useCallback(async (
    id: string,
    patch: Partial<Pick<ClientBreakActivity, 'name' | 'time_estimate'>>,
  ) => {
    setActivities((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
    if (isAuth) {
      try {
        await fetch(`/api/activities/${id}`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        });
      } catch {
        /* keep local change */
      }
    }
  }, [isAuth]);

  const deleteActivity = useCallback(async (id: string) => {
    setActivities((prev) => prev.filter((a) => a.id !== id));
    if (isAuth) {
      try {
        await fetch(`/api/activities/${id}`, { method: 'DELETE', credentials: 'include' });
      } catch {
        /* keep local removal */
      }
    }
  }, [isAuth]);

  const reorderActivities = useCallback(async (orderedIds: string[]) => {
    setActivities((prev) => {
      const map = new Map(prev.map((a) => [a.id, a]));
      const reordered: ClientBreakActivity[] = [];
      orderedIds.forEach((id, i) => {
        const a = map.get(id);
        if (a) reordered.push({ ...a, sort_order: i });
      });
      return reordered;
    });
    if (isAuth) {
      try {
        await fetch('/api/activities/reorder', {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ordered_ids: orderedIds }),
        });
      } catch {
        /* keep local order */
      }
    }
  }, [isAuth]);

  return (
    <BreakActivitiesContext.Provider value={{
      activities, addActivity, updateActivity, deleteActivity, reorderActivities,
    }}>
      {children}
    </BreakActivitiesContext.Provider>
  );
}
