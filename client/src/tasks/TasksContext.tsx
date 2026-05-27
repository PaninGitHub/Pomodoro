import { createContext, useEffect, useState, useCallback, type ReactNode } from 'react';
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
        }
      })();
    } else {
      setTasks(readGuestTasks());
    }
  }, [authState.kind, authState.kind === 'signed_in' ? authState.user.id : null]);

  // Mirror to sessionStorage for guests.
  useEffect(() => {
    if (!isAuth) writeGuestTasks(tasks);
  }, [tasks, isAuth]);

  const addTask = useCallback(async (name: string, time_estimate: number) => {
    if (tasks.length >= MAX_TASKS) {
      return { ok: false, error: `You've reached the maximum of ${MAX_TASKS} tasks.` };
    }
    if (isAuth) {
      try {
        const res = await fetch('/api/tasks', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, time_estimate }),
        });
        if (res.status !== 201) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          return { ok: false, error: body.error ?? 'Could not save task.' };
        }
        const body = (await res.json()) as { task: ClientTask };
        setTasks((prev) => [...prev, body.task]);
        return { ok: true };
      } catch {
        return { ok: false, error: 'Server unreachable.' };
      }
    }
    // Guest: append locally.
    const next: ClientTask = {
      id: randomGuestId(),
      name: name.trim(),
      time_estimate,
      is_complete: false,
      sort_order: tasks.length,
    };
    setTasks((prev) => [...prev, next]);
    return { ok: true };
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
    <TasksContext.Provider value={{ tasks, addTask, updateTask, deleteTask, reorderTasks, toggleComplete }}>
      {children}
    </TasksContext.Provider>
  );
}
