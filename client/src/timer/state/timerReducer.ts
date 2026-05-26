export type TimerMode = 'timer' | 'pomodoro' | 'freestyle';
export type TimerStatus = 'idle' | 'running' | 'paused' | 'completed';
export type PomodoroPeriodType = 'work' | 'short_break' | 'long_break';

export interface PomodoroState {
  periodType: PomodoroPeriodType;
  workCount: number; // completed work periods so far in this session
}

export interface TimerState {
  mode: TimerMode;
  status: TimerStatus;
  totalMs: number;
  startTimestamp: number;  // 0 when not running
  accumulatedMs: number;   // snapshot of elapsed from prior runs
  pomodoro: PomodoroState | null;
  // TODO(phase-2): move to settings DB/cookie.
  autoStartBreaks: boolean;
  autoStartPomodoros: boolean;
}

// =====================================================================
// TODO(phase-2): replace ALL of these literal defaults with values from
// the Settings context once the settings page ships. Per Batch B
// §F-02 / §F-30, defaults are 25/5/20 minutes and long break every
// 4 work periods. longBreakEvery=4 is the per-spec default but Phase 2
// must surface it as a configurable setting.
// =====================================================================
export const POMODORO_DEFAULTS = {
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 20,
  longBreakEvery: 4,
} as const;

const DEFAULT_TIMER_MINUTES = 25;

export const initialTimerState: TimerState = {
  mode: 'timer',
  status: 'idle',
  totalMs: DEFAULT_TIMER_MINUTES * 60 * 1000,
  startTimestamp: 0,
  accumulatedMs: 0,
  pomodoro: null,
  autoStartBreaks: false,
  autoStartPomodoros: false,
};

export type TimerAction =
  | { type: 'SELECT_MODE'; mode: TimerMode }
  | { type: 'SET_DURATION'; minutes: number }
  | { type: 'ADJUST_TOTAL'; deltaMs: number }
  | { type: 'SET_AUTO_START_BREAKS'; value: boolean }
  | { type: 'SET_AUTO_START_POMODOROS'; value: boolean }
  | { type: 'START'; now: number }
  | { type: 'START_POMODORO'; now: number }
  | { type: 'PAUSE'; now: number }
  | { type: 'RESUME'; now: number }
  | { type: 'ABANDON' }
  | { type: 'END_SESSION' }
  | { type: 'PERIOD_COMPLETE'; now: number };

function nextPomodoroPeriod(current: PomodoroState): {
  periodType: PomodoroPeriodType;
  workCount: number;
  totalMs: number;
} {
  if (current.periodType === 'work') {
    const newWorkCount = current.workCount + 1;
    // TODO(phase-2): replace POMODORO_DEFAULTS.longBreakEvery with the
    // long_break_frequency setting from settings.user_id.
    const isLong = newWorkCount % POMODORO_DEFAULTS.longBreakEvery === 0;
    return {
      periodType: isLong ? 'long_break' : 'short_break',
      workCount: newWorkCount,
      totalMs: (isLong ? POMODORO_DEFAULTS.longBreakMinutes : POMODORO_DEFAULTS.shortBreakMinutes) * 60 * 1000,
    };
  }
  // After any break, return to work. workCount stays the same.
  return {
    periodType: 'work',
    workCount: current.workCount,
    totalMs: POMODORO_DEFAULTS.workMinutes * 60 * 1000,
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
    case 'START':
      // Used for Timer, Freestyle, AND starting the next prepared period
      // within a Pomodoro session (where pomodoro state already encodes
      // the upcoming period type via PERIOD_COMPLETE).
      return { ...state, status: 'running', startTimestamp: action.now, accumulatedMs: 0 };
    case 'START_POMODORO':
      // Begins a fresh Pomodoro session at work period 1.
      return {
        ...state,
        status: 'running',
        startTimestamp: action.now,
        accumulatedMs: 0,
        totalMs: POMODORO_DEFAULTS.workMinutes * 60 * 1000,
        pomodoro: { periodType: 'work', workCount: 0 },
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
      // Per F-05: timer resets, no reflection, Pomodoro count does not increment.
      // Phase 1 simplification: abandon ends the Pomodoro session entirely
      // (clears pomodoro state). Phase 2 will refine to "reset just this
      // period and stay in session" if desired.
      return {
        ...state,
        status: 'idle',
        startTimestamp: 0,
        accumulatedMs: 0,
        pomodoro: null,
      };
    case 'END_SESSION':
      return {
        ...state,
        status: 'idle',
        startTimestamp: 0,
        accumulatedMs: 0,
        pomodoro: null,
      };
    case 'PERIOD_COMPLETE': {
      const base = { ...state, startTimestamp: 0, accumulatedMs: 0 };
      if (state.mode !== 'pomodoro' || !state.pomodoro) {
        return { ...base, status: 'completed' };
      }
      // Pomodoro: prepare the next period transparently.
      const next = nextPomodoroPeriod(state.pomodoro);
      return {
        ...base,
        status: 'completed',
        totalMs: next.totalMs,
        pomodoro: { periodType: next.periodType, workCount: next.workCount },
      };
    }
    default:
      return state;
  }
}
