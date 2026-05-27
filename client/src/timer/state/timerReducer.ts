import { earnedBreakMs, roundTo15Seconds } from '../math/freestyleMath';

export type TimerMode = 'timer' | 'pomodoro' | 'freestyle';
export type TimerStatus = 'idle' | 'running' | 'paused' | 'completed';
export type PomodoroPeriodType = 'work' | 'short_break' | 'long_break';
export type FreestylePeriodType = 'work' | 'break';

export interface PomodoroState {
  periodType: PomodoroPeriodType;
  workCount: number; // completed work periods so far in this session
}

export interface FreestyleState {
  periodType: FreestylePeriodType;
  workDurationMs: number;  // preserved across work→break→work cycle (user's set duration)
  bankedMs: number;        // unspent break time from prior periods (Phase 2 surfaces this)
}

export interface TimerState {
  mode: TimerMode;
  status: TimerStatus;
  totalMs: number;
  startTimestamp: number;  // 0 when not running
  accumulatedMs: number;   // snapshot of elapsed from prior runs
  pomodoro: PomodoroState | null;
  freestyle: FreestyleState | null;
  // Pomodoro durations + cycle config — synced from Settings via TimerProvider effect.
  // Phase 2 replaces the hardcoded POMODORO_DEFAULTS reads with these state fields.
  pomodoroWorkMs: number;
  pomodoroShortBreakMs: number;
  pomodoroLongBreakMs: number;
  pomodoroLongBreakEvery: number;
  // Auto-start preferences — synced from Settings via TimerProvider effect.
  autoStartBreaks: boolean;
  autoStartPomodoros: boolean;
  // Freestyle preferences — synced from Settings via TimerProvider effect.
  freestyleRatio: number;
  freestyleAccumulation: boolean;
}

// Spec defaults per Batch B §F-02 / §F-30 (25 / 5 / 20 min, every 4).
// Kept as the initial-state seed; subsequent values come from SettingsContext.
export const POMODORO_DEFAULTS = {
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 20,
  longBreakEvery: 4,
} as const;

const FREESTYLE_DEFAULT_RATIO = 5;
const FREESTYLE_DEFAULT_ACCUMULATION = true;

const DEFAULT_TIMER_MINUTES = 25;

export const initialTimerState: TimerState = {
  mode: 'timer',
  status: 'idle',
  totalMs: DEFAULT_TIMER_MINUTES * 60 * 1000,
  startTimestamp: 0,
  accumulatedMs: 0,
  pomodoro: null,
  freestyle: null,
  pomodoroWorkMs: POMODORO_DEFAULTS.workMinutes * 60 * 1000,
  pomodoroShortBreakMs: POMODORO_DEFAULTS.shortBreakMinutes * 60 * 1000,
  pomodoroLongBreakMs: POMODORO_DEFAULTS.longBreakMinutes * 60 * 1000,
  pomodoroLongBreakEvery: POMODORO_DEFAULTS.longBreakEvery,
  autoStartBreaks: false,
  autoStartPomodoros: false,
  freestyleRatio: FREESTYLE_DEFAULT_RATIO,
  freestyleAccumulation: FREESTYLE_DEFAULT_ACCUMULATION,
};

export type TimerAction =
  | { type: 'SELECT_MODE'; mode: TimerMode }
  | { type: 'SET_DURATION'; minutes: number }
  | { type: 'ADJUST_TOTAL'; deltaMs: number }
  | { type: 'SET_AUTO_START_BREAKS'; value: boolean }
  | { type: 'SET_AUTO_START_POMODOROS'; value: boolean }
  | { type: 'SET_FREESTYLE_RATIO'; value: number }
  | { type: 'SET_FREESTYLE_ACCUMULATION'; value: boolean }
  | { type: 'SET_POMODORO_DURATIONS'; workMs: number; shortBreakMs: number; longBreakMs: number; longBreakEvery: number }
  | { type: 'START'; now: number }
  | { type: 'START_POMODORO'; now: number }
  | { type: 'START_FREESTYLE'; now: number }
  | { type: 'PAUSE'; now: number }
  | { type: 'RESUME'; now: number }
  | { type: 'ABANDON' }
  | { type: 'END_SESSION' }
  | { type: 'PERIOD_COMPLETE'; now: number };

function nextPomodoroPeriod(current: PomodoroState, state: TimerState): {
  periodType: PomodoroPeriodType;
  workCount: number;
  totalMs: number;
} {
  if (current.periodType === 'work') {
    const newWorkCount = current.workCount + 1;
    const isLong = state.pomodoroLongBreakEvery > 0 && newWorkCount % state.pomodoroLongBreakEvery === 0;
    return {
      periodType: isLong ? 'long_break' : 'short_break',
      workCount: newWorkCount,
      totalMs: isLong ? state.pomodoroLongBreakMs : state.pomodoroShortBreakMs,
    };
  }
  // After any break, return to work. workCount stays the same.
  return {
    periodType: 'work',
    workCount: current.workCount,
    totalMs: state.pomodoroWorkMs,
  };
}

export function timerReducer(state: TimerState, action: TimerAction): TimerState {
  switch (action.type) {
    case 'SELECT_MODE':
      if (state.status !== 'idle') return state;
      return { ...state, mode: action.mode };
    case 'SET_DURATION':
      if (state.status !== 'idle') return state;
      // Round to nearest second so decimal-minute inputs (e.g. 1.567) snap to
      // a whole-second total; avoids sub-second drift in display formatting.
      return { ...state, totalMs: Math.round(action.minutes * 60) * 1000 };
    case 'ADJUST_TOTAL': {
      // Mid-session +/- adjust: change the period length without disturbing
      // elapsed time. Allowed during running and paused states (idle uses
      // SET_DURATION). Floors total at 1 second; if the adjustment would
      // make remaining negative, the period-complete effect handles it.
      if (state.status !== 'running' && state.status !== 'paused') return state;
      const next = state.totalMs + action.deltaMs;
      return { ...state, totalMs: Math.max(1000, next) };
    }
    case 'SET_AUTO_START_BREAKS':
      return { ...state, autoStartBreaks: action.value };
    case 'SET_AUTO_START_POMODOROS':
      return { ...state, autoStartPomodoros: action.value };
    case 'SET_POMODORO_DURATIONS':
      return {
        ...state,
        pomodoroWorkMs: action.workMs,
        pomodoroShortBreakMs: action.shortBreakMs,
        pomodoroLongBreakMs: action.longBreakMs,
        pomodoroLongBreakEvery: action.longBreakEvery,
      };
    case 'SET_FREESTYLE_RATIO':
      if (action.value <= 0) return state;
      // Enforce max 2 decimal places per Batch B C-04
      return { ...state, freestyleRatio: Math.round(action.value * 100) / 100 };
    case 'SET_FREESTYLE_ACCUMULATION':
      return { ...state, freestyleAccumulation: action.value };
    case 'START':
      // Used for Timer, Freestyle (when continuing post-break), AND starting
      // the next prepared period within a Pomodoro session.
      return { ...state, status: 'running', startTimestamp: action.now, accumulatedMs: 0 };
    case 'START_POMODORO':
      // Begins a fresh Pomodoro session at work period 1.
      return {
        ...state,
        status: 'running',
        startTimestamp: action.now,
        accumulatedMs: 0,
        totalMs: state.pomodoroWorkMs,
        pomodoro: { periodType: 'work', workCount: 0 },
      };
    case 'START_FREESTYLE':
      // Begins a fresh Freestyle session at work period.
      // Preserves the user-set work duration so the break→next-work transition
      // can restore it (since totalMs gets overwritten by earned break time).
      return {
        ...state,
        status: 'running',
        startTimestamp: action.now,
        accumulatedMs: 0,
        freestyle: { periodType: 'work', workDurationMs: state.totalMs, bankedMs: 0 },
      };
    case 'PAUSE':
      if (state.status !== 'running') return state;
      return {
        ...state,
        status: 'paused',
        accumulatedMs: state.accumulatedMs + (action.now - state.startTimestamp),
        startTimestamp: 0,
      };
    case 'RESUME':
      if (state.status !== 'paused') return state;
      return { ...state, status: 'running', startTimestamp: action.now };
    case 'ABANDON':
      return {
        ...state,
        status: 'idle',
        startTimestamp: 0,
        accumulatedMs: 0,
        pomodoro: null,
        freestyle: null,
      };
    case 'END_SESSION':
      return {
        ...state,
        status: 'idle',
        startTimestamp: 0,
        accumulatedMs: 0,
        pomodoro: null,
        freestyle: null,
      };
    case 'PERIOD_COMPLETE': {
      const base = { ...state, startTimestamp: 0, accumulatedMs: 0 };

      // --- Pomodoro cycling ---
      if (state.mode === 'pomodoro' && state.pomodoro) {
        const next = nextPomodoroPeriod(state.pomodoro, state);
        return {
          ...base,
          status: 'completed',
          totalMs: next.totalMs,
          pomodoro: { periodType: next.periodType, workCount: next.workCount },
        };
      }

      // --- Freestyle cycling ---
      if (state.mode === 'freestyle' && state.freestyle) {
        const fs = state.freestyle;
        if (fs.periodType === 'work') {
          // Work period complete → compute earned break, auto-start it.
          // Phase 1 simplification: bankedMs is always 0 here because Phase 1
          // has no "manually end break early" UI, so no unspent time gets
          // accrued. Phase 2 will add that, and accumulation will matter.
          const earnedRaw = earnedBreakMs(fs.workDurationMs, state.freestyleRatio);
          const earnedRounded = roundTo15Seconds(earnedRaw);
          const carryBanked = state.freestyleAccumulation ? fs.bankedMs : 0;
          const breakTotal = earnedRounded + carryBanked;

          if (breakTotal <= 0) {
            // Edge case: no break earned (ratio so high earned rounded to 0).
            // End the session cleanly rather than start a zero-length break.
            return {
              ...base,
              status: 'idle',
              freestyle: null,
            };
          }

          return {
            ...base,
            status: 'running', // auto-start break (Phase 1 has no toggle for this in Freestyle)
            startTimestamp: action.now,
            totalMs: breakTotal,
            freestyle: { periodType: 'break', workDurationMs: fs.workDurationMs, bankedMs: 0 },
          };
        } else {
          // Break complete → restore work duration, wait for user to Start next.
          // bankedMs unchanged (no unspent time when timer hits 0 naturally).
          return {
            ...base,
            status: 'completed',
            totalMs: fs.workDurationMs,
            freestyle: { periodType: 'work', workDurationMs: fs.workDurationMs, bankedMs: fs.bankedMs },
          };
        }
      }

      // --- Timer mode / no special cycling ---
      return { ...base, status: 'completed' };
    }
    default:
      return state;
  }
}
