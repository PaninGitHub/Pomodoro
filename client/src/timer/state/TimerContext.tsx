import { createContext, useReducer, useEffect, useState, type ReactNode } from 'react';
import { timerReducer, initialTimerState, type TimerState, type TimerAction } from './timerReducer';
import { computeRemaining } from '../math/timerMath';

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

  useEffect(() => {
    if (state.status !== 'running') return;
    const interval = setInterval(() => setNow(Date.now()), TICK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [state.status]);

  const remainingMs = state.status === 'running'
    ? computeRemaining(state, now)
    : Math.max(0, state.totalMs - state.accumulatedMs);

  return (
    <TimerContext.Provider value={{ state, dispatch, remainingMs }}>
      {children}
    </TimerContext.Provider>
  );
}
