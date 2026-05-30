import { earnedBreakMs } from '../math/freestyleMath';

export type TimerMode = 'timer' | 'pomodoro' | 'freestyle';
export type TimerStatus = 'idle' | 'running' | 'paused' | 'completed';
export type PomodoroPeriodType = 'work' | 'short_break' | 'long_break';
export type FreestylePeriodType = 'work' | 'break';

export interface PomodoroState {
  periodType: PomodoroPeriodType;
  workCount: number; // completed work periods so far in this session
}

/**
 * Freestyle state (Phase 2 redesign — Batch B C-09).
 *
 * Work counts UP from 00:00 to either:
 *   - the per-session targetMs (when > 0 and !targetReached), or
 *   - 12-hour cap, or
 *   - user clicks End Work.
 *
 * Prompt state tracks which overlay UI to show:
 *   - 'target_reached' — alarm just fired at the target. Choices:
 *       Continue (targetReached=true, no more alarms), End Work, Reset.
 *   - 'break_choice' — work just ended. Choices: Start Break, Skip Break, End Session.
 *   - 'none' — no prompt; normal running/paused/break state.
 *
 * bankedMs accumulates unspent break time (from Skip Break or Reset; from
 * accumulation toggle across prior periods).
 */
export interface FreestyleState {
  periodType: FreestylePeriodType;
  targetMs: number;        // 0 = no target (stopwatch only)
  targetReached: boolean;  // becomes true on user 'Continue' choice
  bankedMs: number;
  prompt: 'none' | 'target_reached' | 'break_choice';
}

export interface TimerState {
  mode: TimerMode;
  status: TimerStatus;
  totalMs: number;
  startTimestamp: number;
  accumulatedMs: number;
  pomodoro: PomodoroState | null;
  freestyle: FreestyleState | null;
  pomodoroWorkMs: number;
  pomodoroShortBreakMs: number;
  pomodoroLongBreakMs: number;
  pomodoroLongBreakEvery: number;
  autoStartBreaks: boolean;
  autoStartPomodoros: boolean;
  freestyleRatio: number;
  freestyleAccumulation: boolean;
  freestyleBreaksEnabled: boolean;
  freestyleTargetEnabled: boolean; // per-session UI choice (default true)
}

export const POMODORO_DEFAULTS = {
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 20,
  longBreakEvery: 4,
} as const;

const FREESTYLE_DEFAULT_RATIO = 5;
const FREESTYLE_DEFAULT_ACCUMULATION = true;
const FREESTYLE_DEFAULT_BREAKS_ENABLED = true;

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
  freestyleBreaksEnabled: FREESTYLE_DEFAULT_BREAKS_ENABLED,
  freestyleTargetEnabled: true,
};

export type TimerAction =
  | { type: 'SELECT_MODE'; mode: TimerMode }
  | { type: 'SET_DURATION'; minutes: number }
  | { type: 'ADJUST_TOTAL'; deltaMs: number }
  | { type: 'SET_AUTO_START_BREAKS'; value: boolean }
  | { type: 'SET_AUTO_START_POMODOROS'; value: boolean }
  | { type: 'SET_FREESTYLE_RATIO'; value: number }
  | { type: 'SET_FREESTYLE_ACCUMULATION'; value: boolean }
  | { type: 'SET_FREESTYLE_BREAKS_ENABLED'; value: boolean }
  | { type: 'SET_FREESTYLE_TARGET_ENABLED'; value: boolean }
  | { type: 'SET_POMODORO_DURATIONS'; workMs: number; shortBreakMs: number; longBreakMs: number; longBreakEvery: number }
  | { type: 'START'; now: number }
  | { type: 'START_POMODORO'; now: number }
  // START_FREESTYLE begins a new Freestyle session with target = `targetMs`
  // (0 = no target, i.e. stopwatch mode).
  | { type: 'START_FREESTYLE'; now: number; targetMs: number }
  | { type: 'PAUSE'; now: number }
  | { type: 'RESUME'; now: number }
  | { type: 'ABANDON' }
  | { type: 'END_SESSION' }
  | { type: 'PERIOD_COMPLETE'; now: number }
  // Freestyle-specific prompt actions (C-09):
  | { type: 'FREESTYLE_TARGET_HIT'; now: number }
  | { type: 'FREESTYLE_CONTINUE'; now: number }
  | { type: 'FREESTYLE_RESET'; now: number }
  | { type: 'FREESTYLE_END_WORK'; now: number }
  | { type: 'FREESTYLE_START_BREAK'; now: number }
  | { type: 'FREESTYLE_SKIP_BREAK'; now: number };

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
  return {
    periodType: 'work',
    workCount: current.workCount,
    totalMs: state.pomodoroWorkMs,
  };
}

/** Helper: compute current elapsed work time given state. Used by Freestyle actions. */
function currentElapsedMs(state: TimerState, now: number): number {
  return state.accumulatedMs + (state.startTimestamp > 0 ? now - state.startTimestamp : 0);
}

export function timerReducer(state: TimerState, action: TimerAction): TimerState {
  switch (action.type) {
    case 'SELECT_MODE':
      if (state.status !== 'idle') return state;
      return { ...state, mode: action.mode };
    case 'SET_DURATION':
      if (state.status !== 'idle') return state;
      return { ...state, totalMs: Math.round(action.minutes * 60) * 1000 };
    case 'ADJUST_TOTAL': {
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
      return { ...state, freestyleRatio: Math.round(action.value * 100) / 100 };
    case 'SET_FREESTYLE_ACCUMULATION':
      return { ...state, freestyleAccumulation: action.value };
    case 'SET_FREESTYLE_BREAKS_ENABLED':
      return { ...state, freestyleBreaksEnabled: action.value };
    case 'SET_FREESTYLE_TARGET_ENABLED':
      return { ...state, freestyleTargetEnabled: action.value };
    case 'START':
      // Used for Timer, Pomodoro (post-break), and Freestyle (post-break, next work).
      return { ...state, status: 'running', startTimestamp: action.now, accumulatedMs: 0 };
    case 'START_POMODORO':
      return {
        ...state,
        status: 'running',
        startTimestamp: action.now,
        accumulatedMs: 0,
        totalMs: state.pomodoroWorkMs,
        pomodoro: { periodType: 'work', workCount: 0 },
      };
    case 'START_FREESTYLE':
      // C-09: Begins a freestyle work period that counts UP. Optional target.
      return {
        ...state,
        status: 'running',
        startTimestamp: action.now,
        accumulatedMs: 0,
        totalMs: 0, // unused in Freestyle work — elapsed drives the display
        freestyle: {
          periodType: 'work',
          targetMs: action.targetMs,
          targetReached: false,
          bankedMs: 0,
          prompt: 'none',
        },
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

    // ============================================================
    // Freestyle-specific (C-09)
    // ============================================================

    case 'FREESTYLE_TARGET_HIT': {
      // Fired by TimerArea effect when elapsed >= targetMs and !targetReached.
      // Pause the timer (snapshot elapsed) and show the choice prompt.
      if (state.mode !== 'freestyle' || !state.freestyle) return state;
      if (state.freestyle.prompt !== 'none') return state; // already prompting
      const elapsed = currentElapsedMs(state, action.now);
      return {
        ...state,
        status: 'paused',
        accumulatedMs: elapsed,
        startTimestamp: 0,
        freestyle: { ...state.freestyle, prompt: 'target_reached' },
      };
    }

    case 'FREESTYLE_CONTINUE': {
      // User chose "Continue working" at target hit. Mark targetReached so no
      // more alarms fire this period. Resume counting up.
      if (state.mode !== 'freestyle' || !state.freestyle) return state;
      return {
        ...state,
        status: 'running',
        startTimestamp: action.now,
        freestyle: { ...state.freestyle, targetReached: true, prompt: 'none' },
      };
    }

    case 'FREESTYLE_RESET': {
      // User chose "Reset" at target hit. Bank the earned break time, reset
      // elapsed to 0, continue work period (targetReached stays false so
      // alarm fires again on next target hit).
      if (state.mode !== 'freestyle' || !state.freestyle) return state;
      const elapsed = state.accumulatedMs; // (we already paused on TARGET_HIT)
      const earnedThisRun = earnedBreakMs(elapsed, state.freestyleRatio);
      const newBanked = state.freestyle.bankedMs + earnedThisRun;
      return {
        ...state,
        status: 'running',
        startTimestamp: action.now,
        accumulatedMs: 0,
        freestyle: {
          ...state.freestyle,
          bankedMs: newBanked,
          prompt: 'none',
          // targetReached stays false: alarm CAN fire again
        },
      };
    }

    case 'FREESTYLE_END_WORK': {
      // User clicked "End Work" (or chose End Work from target_reached prompt).
      // Compute earned break from elapsed; transition to break_choice prompt.
      // If freestyleBreaksEnabled = false, skip the prompt and end session.
      if (state.mode !== 'freestyle' || !state.freestyle) return state;
      if (state.freestyle.periodType !== 'work') return state;
      const elapsed = currentElapsedMs(state, action.now);

      if (!state.freestyleBreaksEnabled) {
        // No-breaks mode → straight to session-end.
        return {
          ...state,
          status: 'idle',
          startTimestamp: 0,
          accumulatedMs: 0,
          freestyle: null,
        };
      }

      // Show break_choice prompt. Pause and snapshot elapsed so the math
      // doesn't drift while the user decides.
      return {
        ...state,
        status: 'paused',
        accumulatedMs: elapsed,
        startTimestamp: 0,
        freestyle: { ...state.freestyle, prompt: 'break_choice' },
      };
    }

    case 'FREESTYLE_START_BREAK': {
      // User chose "Start Break" at break_choice prompt.
      // Earned break (this period) + banked. Transition to break period.
      if (state.mode !== 'freestyle' || !state.freestyle) return state;
      const elapsedWork = state.accumulatedMs; // snapshot from END_WORK pause
      const earnedThisPeriod = earnedBreakMs(elapsedWork, state.freestyleRatio);
      const carryBanked = state.freestyleAccumulation ? state.freestyle.bankedMs : 0;
      const breakTotal = Math.round(earnedThisPeriod + carryBanked);

      if (breakTotal <= 0) {
        return {
          ...state,
          status: 'idle',
          startTimestamp: 0,
          accumulatedMs: 0,
          freestyle: null,
        };
      }

      return {
        ...state,
        status: 'running',
        startTimestamp: action.now,
        accumulatedMs: 0,
        totalMs: breakTotal,
        freestyle: {
          periodType: 'break',
          targetMs: state.freestyle.targetMs,
          targetReached: false,
          bankedMs: 0, // consumed by this break
          prompt: 'none',
        },
      };
    }

    case 'FREESTYLE_SKIP_BREAK': {
      // User chose "Skip Break" at break_choice prompt.
      // Bank earned-this-period (if accumulation ON) + prior banked.
      // Return to between-periods state (status=completed); user clicks Start
      // to begin the next work period.
      if (state.mode !== 'freestyle' || !state.freestyle) return state;
      const elapsedWork = state.accumulatedMs;
      const earnedThisPeriod = earnedBreakMs(elapsedWork, state.freestyleRatio);
      const newBanked = state.freestyleAccumulation
        ? state.freestyle.bankedMs + earnedThisPeriod
        : 0;
      return {
        ...state,
        status: 'completed',
        startTimestamp: 0,
        accumulatedMs: 0,
        freestyle: {
          periodType: 'work',
          targetMs: state.freestyle.targetMs,
          targetReached: false,
          bankedMs: newBanked,
          prompt: 'none',
        },
      };
    }

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

      // --- Freestyle break completion ---
      if (state.mode === 'freestyle' && state.freestyle) {
        // PERIOD_COMPLETE only applies to BREAK periods in Freestyle now
        // (work doesn't auto-complete; user must End Work or hit target).
        if (state.freestyle.periodType === 'break') {
          // Break finished naturally; ready for next work period.
          return {
            ...base,
            status: 'completed',
            totalMs: 0,
            freestyle: {
              periodType: 'work',
              targetMs: state.freestyle.targetMs,
              targetReached: false,
              bankedMs: 0,
              prompt: 'none',
            },
          };
        }
        // Defensive: work-period PERIOD_COMPLETE shouldn't happen but
        // treat as end-work for safety.
        return base;
      }

      // --- Timer mode / fallthrough ---
      return { ...base, status: 'completed' };
    }

    default:
      return state;
  }
}
