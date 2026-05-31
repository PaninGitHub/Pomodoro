import { createContext, useReducer, useEffect, useRef, useState, type ReactNode } from 'react';
import { timerReducer, initialTimerState, type TimerState, type TimerAction } from './timerReducer';

// True while we're actively serving out a break period (running or paused
// — not 'completed' which means "break ready to start, awaiting click").
// Used by the break-log PATCH-on-end watcher to detect transitions OUT.
function isActiveBreak(s: TimerState): boolean {
  if (s.status !== 'running' && s.status !== 'paused') return false;
  if (s.mode === 'pomodoro') {
    return s.pomodoro?.periodType === 'short_break' || s.pomodoro?.periodType === 'long_break';
  }
  if (s.mode === 'freestyle') {
    return s.freestyle?.periodType === 'break';
  }
  return false;
}
import { computeRemaining } from '../math/timerMath';
import { useSettings } from '../../settings/useSettings';
import { useAuth } from '../../auth/useAuth';
import { useTasks } from '../../tasks/useTasks';

interface TimerContextValue {
  state: TimerState;
  dispatch: (action: TimerAction) => void;
  remainingMs: number;
}

export const TimerContext = createContext<TimerContextValue | null>(null);

const TICK_INTERVAL_MS = 250;

export function TimerProvider({ children }: { children: ReactNode }): JSX.Element {
  const [state, dispatch] = useReducer(timerReducer, initialTimerState);
  const [now, setNow] = useState<number>(Date.now());
  const { settings } = useSettings();
  const { state: authState } = useAuth();
  const { tasks } = useTasks();

  useEffect(() => {
    if (state.status !== 'running') return;
    // Fix for start/resume glitch: snap `now` to wall-clock time immediately
    // when entering running state. Without this, the first render after
    // status change uses a stale `now` (last tick from before the pause),
    // causing computeRemaining to return wildly wrong values for one render.
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), TICK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [state.status, state.startTimestamp]);

  // Sync Settings → TimerState. Whenever Settings changes (login, manual edit,
  // cookie load), push the relevant fields into the reducer so future
  // START_POMODORO / START_FREESTYLE / PERIOD_COMPLETE actions use the
  // user's configured values instead of literal defaults.
  useEffect(() => {
    if (state.status !== 'idle') return; // don't disturb running sessions
    dispatch({
      type: 'SET_POMODORO_DURATIONS',
      workMs: settings.work_duration * 60 * 1000,
      shortBreakMs: settings.short_break_duration * 60 * 1000,
      longBreakMs: settings.long_break_duration * 60 * 1000,
      longBreakEvery: settings.long_break_frequency,
    });
    dispatch({ type: 'SET_AUTO_START_BREAKS', value: settings.auto_start_breaks });
    dispatch({ type: 'SET_AUTO_START_POMODOROS', value: settings.auto_start_pomodoros });
    dispatch({ type: 'SET_FREESTYLE_RATIO', value: settings.freestyle_ratio });
    dispatch({ type: 'SET_FREESTYLE_ACCUMULATION', value: settings.freestyle_accumulate });
  }, [
    state.status,
    settings.work_duration,
    settings.short_break_duration,
    settings.long_break_duration,
    settings.long_break_frequency,
    settings.auto_start_breaks,
    settings.auto_start_pomodoros,
    settings.freestyle_ratio,
    settings.freestyle_accumulate,
  ]);

  // Create a timer_sessions row whenever a session transitions from
  // idle → running AND we don't already have a session_id. Guests skip
  // (no auth). On failure, log and continue — the timer still works
  // locally without server-side session persistence.
  useEffect(() => {
    if (authState.kind !== 'signed_in') return;
    if (state.status !== 'running') return;
    if (state.currentSessionId !== null) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/sessions', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: state.mode }),
        });
        if (!cancelled && res.status === 201) {
          const body = (await res.json()) as { session_id: string };
          dispatch({ type: 'SET_SESSION_ID', sessionId: body.session_id });
        }
      } catch {
        // Network failure: session still runs locally; just no DB row.
      }
    })();
    return () => { cancelled = true; };
  }, [authState.kind, state.status, state.currentSessionId, state.mode]);

  // Capture period-start tasks snapshot whenever a work period begins.
  // Work-period start = status transitions to 'running' AND the current
  // period (or mode for Timer) is a work period. The
  // `currentPeriodTasksSnapshot !== null` guard prevents recapture during
  // the same period; the reducer clears it on REFLECTION_SUBMITTED /
  // REFLECTION_SKIPPED / END_SESSION so the next work period repopulates.
  useEffect(() => {
    if (state.status !== 'running') return;
    if (state.currentPeriodTasksSnapshot !== null) return;

    const isWorkPeriod =
      state.mode === 'timer' ||
      (state.mode === 'pomodoro' && state.pomodoro?.periodType === 'work') ||
      (state.mode === 'freestyle' && state.freestyle?.periodType === 'work');
    if (!isWorkPeriod) return;

    dispatch({
      type: 'SET_PERIOD_TASKS_SNAPSHOT',
      tasks: tasks.map((t) => ({ id: t.id, name: t.name })),
    });
  }, [
    state.status,
    state.mode,
    state.pomodoro?.periodType,
    state.freestyle?.periodType,
    state.currentPeriodTasksSnapshot,
    tasks,
  ]);

  // Patch the timer_sessions row when a session ends. "End" = status
  // transitions to idle while we still have a captured session id from
  // the prior run. The effect reads the prior id from a ref because the
  // reducer (ABANDON / END_SESSION) clears currentSessionId in the same
  // tick, so we'd miss it if we read it from state at the moment of close.
  const prevSessionIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (authState.kind !== 'signed_in') return;
    const closing = state.status === 'idle' && prevSessionIdRef.current !== null;
    if (closing) {
      const closingId = prevSessionIdRef.current!;
      prevSessionIdRef.current = null;
      void (async () => {
        try {
          await fetch(`/api/sessions/${closingId}`, {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ended_at: new Date().toISOString(), ended_early: true }),
          });
        } catch {
          // Best-effort; the row stays open if the network fails. A
          // future cleanup job can sweep stale open sessions.
        }
      })();
    }
    if (state.currentSessionId !== null) {
      prevSessionIdRef.current = state.currentSessionId;
    }
  }, [authState.kind, state.status, state.currentSessionId]);

  // Patch the break_logs row when a break period ends. "End" = transition
  // from active break (running/paused on a break period) to anything else
  // (next work via PERIOD_COMPLETE, session end via ABANDON/END_SESSION,
  // reflection chain, etc.). Mirrors the prevSessionIdRef pattern above —
  // the reducer's END_SESSION/ABANDON clear currentBreakLogId in the same
  // tick, so the PATCH effect snapshots the id via ref to survive the clear.
  //
  // For natural period transitions (break → work), the reducer's
  // PERIOD_COMPLETE doesn't clear currentBreakLogId — this effect detects
  // the active-break → not-active-break transition and dispatches
  // SET_BREAK_LOG_ID null itself, after firing the PATCH.
  //
  // KNOWN LIMITATION: if the user reloads the browser mid-break, the in-DB
  // row stays with NULL break_ended_at indefinitely. A sweep job (mirroring
  // the timer_sessions 12-hour auto-end pattern in Batch D §12.7) is the
  // proper fix and is deferred — track via PROGRESS.md follow-up.
  const prevBreakLogIdRef = useRef<string | null>(null);
  const wasInBreakRef = useRef<boolean>(false);
  useEffect(() => {
    const inBreak = isActiveBreak(state);
    const closing = wasInBreakRef.current && !inBreak && prevBreakLogIdRef.current !== null;
    if (closing) {
      const closingId = prevBreakLogIdRef.current!;
      prevBreakLogIdRef.current = null;
      if (authState.kind === 'signed_in') {
        void (async () => {
          try {
            await fetch(`/api/break-logs/${closingId}`, {
              method: 'PATCH',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ break_ended_at: new Date().toISOString() }),
            });
          } catch {
            // Best-effort; the row stays open. See KNOWN LIMITATION above.
          }
        })();
      }
      if (state.currentBreakLogId !== null) {
        dispatch({ type: 'SET_BREAK_LOG_ID', logId: null });
      }
    }
    wasInBreakRef.current = inBreak;
    if (state.currentBreakLogId !== null) {
      prevBreakLogIdRef.current = state.currentBreakLogId;
    }
  }, [
    authState.kind,
    state.status,
    state.mode,
    state.currentBreakLogId,
    state.pomodoro?.periodType,
    state.freestyle?.periodType,
  ]);

  const remainingMs = state.status === 'running'
    ? computeRemaining(state, now)
    : Math.max(0, state.totalMs - state.accumulatedMs);

  return (
    <TimerContext.Provider value={{ state, dispatch, remainingMs }}>
      {children}
    </TimerContext.Provider>
  );
}
