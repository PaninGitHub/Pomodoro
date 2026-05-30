import { createContext, useReducer, useEffect, useState, type ReactNode } from 'react';
import { timerReducer, initialTimerState, type TimerState, type TimerAction } from './timerReducer';
import { computeRemaining } from '../math/timerMath';
import { useSettings } from '../../settings/useSettings';
import { useAuth } from '../../auth/useAuth';

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

  const remainingMs = state.status === 'running'
    ? computeRemaining(state, now)
    : Math.max(0, state.totalMs - state.accumulatedMs);

  return (
    <TimerContext.Provider value={{ state, dispatch, remainingMs }}>
      {children}
    </TimerContext.Provider>
  );
}
