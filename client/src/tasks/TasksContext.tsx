import { createContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import { useAuth } from '../auth/useAuth';

export interface ClientTask {
  id: string;
  name: string;
  time_estimate: number;
  is_complete: boolean;
  sort_order: number;
}

export const MAX_TASKS = 20;
const SESSION_KEY = 'simplidoro.tasks';

interface TasksContextValue {
  tasks: ClientTask[];
  addTask: (name: string, timeEstimate: number) => Promise<{ ok: boolean; error?: string }>;
  updateTask: (id: string, patch: Partial<Pick<ClientTask, 'name' | 'time_estimate' | 'is_complete'>>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  clearAllTasks: () => Promise<void>;
  reorderTasks: (orderedIds: string[]) => Promise<void>;
  toggleComplete: (id: string) => Promise<void>;
}

export const TasksContext = createContext<TasksContextValue | null>(null);

// Guest-only persistence: sessionStorage per Batch B C-08 (Phase 2).
function readGuestTasks(): ClientTask[] {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as ClientTask[];
  } catch {
    return [];
  }
}

function writeGuestTasks(tasks: ClientTask[]): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(tasks));
  } catch {
    /* swallow quota errors; not fatal */
  }
}

function randomGuestId(): string {
  // Simple non-crypto ID for guest tasks; UUID-shape so reorder logic works the same.
  // crypto.randomUUID exists in modern browsers.
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return (crypto as Crypto).randomUUID();
  }
  return `guest-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function TasksProvider({ children }: { children: ReactNode }): JSX.Element {
  const { state: authState } = useAuth();
  const [tasks, setTasks] = useState<ClientTask[]>([]);
  // Gate the guest-write effect: don't overwrite sessionStorage with the initial
  // empty array. Only mirror writes that happen AFTER the initial load completes.
  // Without this, mount runs (auth='loading' → write effect fires → writes []),
  // clobbering any pre-existing guest tasks before the read effect gets a chance.
  const hasLoadedRef = useRef(false);

  const isAuth = authState.kind === 'signed_in';

  // Initial / auth-transition load.
  useEffect(() => {
    if (authState.kind === 'loading') return;
    if (authState.kind === 'signed_in') {
      void (async () => {
        try {
          const res = await fetch('/api/tasks', { credentials: 'include' });
          if (res.status === 200) {
            const body = (await res.json()) as { tasks: ClientTask[] };
            setTasks(body.tasks);
          } else {
            setTasks([]);
          }
        } catch {
          setTasks([]);
        } finally {
          hasLoadedRef.current = true;
        }
      })();
    } else {
      setTasks(readGuestTasks());
      hasLoadedRef.current = true;
    }
  }, [authState.kind, authState.kind === 'signed_in' ? authState.user.id : null]);

  // Mirror to sessionStorage for guests — but only after the initial load runs,
  // so we don't clobber prior sessionStorage with the initial empty React state.
  useEffect(() => {
    if (!hasLoadedRef.current) return;
    if (!isAuth) writeGuestTasks(tasks);
  }, [tasks, isAuth]);

  const addTask = useCallback(async (name: string, time_estimate: number) => {
    if (tasks.length >= MAX_TASKS) {
      return { ok: false, error: `You've reached the maximum of ${MAX_TASKS} tasks.` };
    }
    // Optimistic append (auth + guest). Auth path replaces temp row with the
    // server's row on 201, or rolls back on failure. Removes the perceived
    // 2-3 second add-delay caused by waiting for the POST round-trip.
    const tempId = randomGuestId();
    const optimistic: ClientTask = {
      id: tempId,
      name: name.trim(),
      time_estimate,
      is_complete: false,
      sort_order: tasks.length,
    };
    setTasks((prev) => [...prev, optimistic]);

    if (!isAuth) return { ok: true };

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, time_estimate }),
      });
      if (res.status !== 201) {
        setTasks((prev) => prev.filter((t) => t.id !== tempId));
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        return { ok: false, error: body.error ?? 'Could not save task.' };
      }
      const body = (await res.json()) as { task: ClientTask };
      setTasks((prev) => prev.map((t) => (t.id === tempId ? body.task : t)));
      return { ok: true };
    } catch {
      setTasks((prev) => prev.filter((t) => t.id !== tempId));
      return { ok: false, error: 'Server unreachable.' };
    }
  }, [isAuth, tasks.length]);

  const updateTask = useCallback(async (id: string, patch: Partial<Pick<ClientTask, 'name' | 'time_estimate' | 'is_complete'>>) => {
    // Optimistic local update.
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    if (isAuth) {
      try {
        await fetch(`/api/tasks/${id}`, {
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

  const deleteTask = useCallback(async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    if (isAuth) {
      try {
        await fetch(`/api/tasks/${id}`, { method: 'DELETE', credentials: 'include' });
      } catch {
        /* keep local removal */
      }
    }
  }, [isAuth]);

  const clearAllTasks = useCallback(async () => {
    const prev = tasks;
    setTasks([]);
    if (isAuth) {
      try {
        const res = await fetch('/api/tasks', { method: 'DELETE', credentials: 'include' });
        if (res.status !== 200) setTasks(prev);
      } catch {
        setTasks(prev);
      }
    }
  }, [tasks, isAuth]);

  const reorderTasks = useCallback(async (orderedIds: string[]) => {
    setTasks((prev) => {
      const map = new Map(prev.map((t) => [t.id, t]));
      const reordered: ClientTask[] = [];
      orderedIds.forEach((id, i) => {
        const t = map.get(id);
        if (t) reordered.push({ ...t, sort_order: i });
      });
      return reordered;
    });
    if (isAuth) {
      try {
        await fetch('/api/tasks/reorder', {
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

  const toggleComplete = useCallback(async (id: string) => {
    const target = tasks.find((t) => t.id === id);
    if (!target) return;
    await updateTask(id, { is_complete: !target.is_complete });
  }, [tasks, updateTask]);

  return (
    <TasksContext.Provider value={{ tasks, addTask, updateTask, deleteTask, clearAllTasks, reorderTasks, toggleComplete }}>
      {children}
    </TasksContext.Provider>
  );
}
