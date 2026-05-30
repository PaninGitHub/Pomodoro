import { describe, it, expect } from 'vitest';
import { timerReducer, initialTimerState, type TimerState } from './timerReducer';

const NOW = 10_000_000;

describe('timerReducer — base', () => {
  it('starts in idle for Timer mode with no pomodoro state', () => {
    expect(initialTimerState.status).toBe('idle');
    expect(initialTimerState.mode).toBe('timer');
    expect(initialTimerState.pomodoro).toBeNull();
    expect(initialTimerState.autoStartBreaks).toBe(false);
    expect(initialTimerState.autoStartPomodoros).toBe(false);
  });

  it('SELECT_MODE switches mode when idle', () => {
    const s = timerReducer(initialTimerState, { type: 'SELECT_MODE', mode: 'pomodoro' });
    expect(s.mode).toBe('pomodoro');
  });

  it('SELECT_MODE is no-op when running', () => {
    const running: TimerState = { ...initialTimerState, status: 'running' };
    const s = timerReducer(running, { type: 'SELECT_MODE', mode: 'freestyle' });
    expect(s.mode).toBe(running.mode);
  });

  it('SET_DURATION updates totalMs when idle', () => {
    const s = timerReducer(initialTimerState, { type: 'SET_DURATION', minutes: 30 });
    expect(s.totalMs).toBe(30 * 60 * 1000);
  });

  it('START transitions Timer/Freestyle to running with timestamp', () => {
    const s = timerReducer(initialTimerState, { type: 'START', now: NOW });
    expect(s.status).toBe('running');
    expect(s.startTimestamp).toBe(NOW);
    expect(s.accumulatedMs).toBe(0);
  });

  it('PAUSE snapshots elapsed into accumulated', () => {
    const running = timerReducer(initialTimerState, { type: 'START', now: NOW });
    const paused = timerReducer(running, { type: 'PAUSE', now: NOW + 5000 });
    expect(paused.status).toBe('paused');
    expect(paused.accumulatedMs).toBe(5000);
  });

  it('RESUME re-stamps start, preserves accumulated', () => {
    const running = timerReducer(initialTimerState, { type: 'START', now: NOW });
    const paused = timerReducer(running, { type: 'PAUSE', now: NOW + 5000 });
    const resumed = timerReducer(paused, { type: 'RESUME', now: NOW + 100000 });
    expect(resumed.status).toBe('running');
    expect(resumed.startTimestamp).toBe(NOW + 100000);
    expect(resumed.accumulatedMs).toBe(5000);
  });

  it('END_SESSION returns to idle and clears pomodoro state', () => {
    const pomodoroRunning: TimerState = {
      ...initialTimerState, mode: 'pomodoro', status: 'running',
      pomodoro: { periodType: 'work', workCount: 2 },
    };
    const ended = timerReducer(pomodoroRunning, { type: 'END_SESSION' });
    expect(ended.status).toBe('idle');
    expect(ended.pomodoro).toBeNull();
  });
});

describe('timerReducer — Pomodoro cycling', () => {
  const pomodoroIdle: TimerState = { ...initialTimerState, mode: 'pomodoro' };

  it('START_POMODORO begins work period 1 with workCount=0', () => {
    const s = timerReducer(pomodoroIdle, { type: 'START_POMODORO', now: NOW });
    expect(s.status).toBe('running');
    expect(s.pomodoro).toEqual({ periodType: 'work', workCount: 0 });
    expect(s.totalMs).toBe(25 * 60 * 1000);
    expect(s.startTimestamp).toBe(NOW);
  });

  it('PERIOD_COMPLETE after first work period prepares short break and workCount=1', () => {
    const inWork = timerReducer(pomodoroIdle, { type: 'START_POMODORO', now: NOW });
    const completed = timerReducer(inWork, { type: 'PERIOD_COMPLETE', now: NOW + 1500000 });
    expect(completed.status).toBe('completed');
    expect(completed.pomodoro?.periodType).toBe('short_break');
    expect(completed.pomodoro?.workCount).toBe(1);
    expect(completed.totalMs).toBe(5 * 60 * 1000);
  });

  it('PERIOD_COMPLETE after fourth work period prepares long break', () => {
    const after3: TimerState = {
      ...pomodoroIdle, status: 'running',
      pomodoro: { periodType: 'work', workCount: 3 },
    };
    const completed = timerReducer(after3, { type: 'PERIOD_COMPLETE', now: NOW });
    expect(completed.pomodoro?.periodType).toBe('long_break');
    expect(completed.pomodoro?.workCount).toBe(4);
    expect(completed.totalMs).toBe(20 * 60 * 1000);
  });

  it('PERIOD_COMPLETE after short break returns to work, workCount unchanged', () => {
    const inBreak: TimerState = {
      ...pomodoroIdle, status: 'running',
      pomodoro: { periodType: 'short_break', workCount: 1 },
    };
    const completed = timerReducer(inBreak, { type: 'PERIOD_COMPLETE', now: NOW });
    expect(completed.pomodoro?.periodType).toBe('work');
    expect(completed.pomodoro?.workCount).toBe(1);
    expect(completed.totalMs).toBe(25 * 60 * 1000);
  });

  it('PERIOD_COMPLETE after long break returns to work (count preserved)', () => {
    const inLong: TimerState = {
      ...pomodoroIdle, status: 'running',
      pomodoro: { periodType: 'long_break', workCount: 4 },
    };
    const completed = timerReducer(inLong, { type: 'PERIOD_COMPLETE', now: NOW });
    expect(completed.pomodoro?.periodType).toBe('work');
    expect(completed.pomodoro?.workCount).toBe(4);
  });

  it('START from completed state begins the next prepared period', () => {
    const completedWork: TimerState = {
      ...pomodoroIdle, status: 'completed', totalMs: 5 * 60 * 1000,
      pomodoro: { periodType: 'short_break', workCount: 1 },
    };
    const s = timerReducer(completedWork, { type: 'START', now: NOW });
    expect(s.status).toBe('running');
    expect(s.startTimestamp).toBe(NOW);
    expect(s.pomodoro?.periodType).toBe('short_break');
  });

  it('ABANDON in Pomodoro clears pomodoro state and returns to idle', () => {
    const inWork: TimerState = {
      ...pomodoroIdle, status: 'running',
      pomodoro: { periodType: 'work', workCount: 2 },
    };
    const abandoned = timerReducer(inWork, { type: 'ABANDON' });
    expect(abandoned.status).toBe('idle');
    expect(abandoned.pomodoro).toBeNull();
  });

  it('PERIOD_COMPLETE in Timer mode (no pomodoro) just completes', () => {
    const running = timerReducer(initialTimerState, { type: 'START', now: NOW });
    const done = timerReducer(running, { type: 'PERIOD_COMPLETE', now: NOW + 1000 });
    expect(done.status).toBe('completed');
    expect(done.pomodoro).toBeNull();
  });
});

describe('timerReducer — Freestyle (C-09 stopwatch redesign)', () => {
  const freestyleIdle: TimerState = {
    ...initialTimerState,
    mode: 'freestyle',
    totalMs: 5 * 60 * 1000, // 5 minute target set via click-to-edit
  };

  it('START_FREESTYLE begins a work period with the given target', () => {
    const s = timerReducer(freestyleIdle, { type: 'START_FREESTYLE', now: NOW, targetMs: 5 * 60 * 1000 });
    expect(s.status).toBe('running');
    expect(s.freestyle?.periodType).toBe('work');
    expect(s.freestyle?.targetMs).toBe(5 * 60 * 1000);
    expect(s.freestyle?.targetReached).toBe(false);
    expect(s.freestyle?.bankedMs).toBe(0);
    expect(s.freestyle?.prompt).toBe('none');
  });

  it('START_FREESTYLE with targetMs=0 (target disabled, pure stopwatch)', () => {
    const s = timerReducer(freestyleIdle, { type: 'START_FREESTYLE', now: NOW, targetMs: 0 });
    expect(s.freestyle?.targetMs).toBe(0);
  });

  it('FREESTYLE_TARGET_HIT pauses + shows target_reached prompt', () => {
    const inWork = timerReducer(freestyleIdle, { type: 'START_FREESTYLE', now: NOW, targetMs: 5 * 60 * 1000 });
    const hit = timerReducer(inWork, { type: 'FREESTYLE_TARGET_HIT', now: NOW + 5 * 60 * 1000 });
    expect(hit.status).toBe('paused');
    expect(hit.freestyle?.prompt).toBe('target_reached');
    expect(hit.accumulatedMs).toBe(5 * 60 * 1000);
  });

  it('FREESTYLE_CONTINUE resumes work, marks targetReached (no more alarms)', () => {
    const inWork = timerReducer(freestyleIdle, { type: 'START_FREESTYLE', now: NOW, targetMs: 60_000 });
    const hit = timerReducer(inWork, { type: 'FREESTYLE_TARGET_HIT', now: NOW + 60_000 });
    const cont = timerReducer(hit, { type: 'FREESTYLE_CONTINUE', now: NOW + 60_500 });
    expect(cont.status).toBe('running');
    expect(cont.freestyle?.targetReached).toBe(true);
    expect(cont.freestyle?.prompt).toBe('none');
  });

  it('FREESTYLE_RESET banks earned, resets elapsed, keeps target alarm armed', () => {
    const inWork = timerReducer(freestyleIdle, { type: 'START_FREESTYLE', now: NOW, targetMs: 5 * 60 * 1000 });
    const hit = timerReducer(inWork, { type: 'FREESTYLE_TARGET_HIT', now: NOW + 5 * 60 * 1000 });
    const reset = timerReducer(hit, { type: 'FREESTYLE_RESET', now: NOW + 5 * 60 * 1000 });
    // 5 min work / ratio 5 = 60s earned, banked
    expect(reset.freestyle?.bankedMs).toBe(60_000);
    expect(reset.accumulatedMs).toBe(0);
    expect(reset.status).toBe('running');
    expect(reset.freestyle?.targetReached).toBe(false);
    expect(reset.freestyle?.prompt).toBe('none');
  });

  it('FREESTYLE_END_WORK (breaks enabled) → paused + break_choice prompt', () => {
    const inWork = timerReducer(freestyleIdle, { type: 'START_FREESTYLE', now: NOW, targetMs: 0 });
    const end = timerReducer(inWork, { type: 'FREESTYLE_END_WORK', now: NOW + 5 * 60 * 1000 });
    expect(end.status).toBe('paused');
    expect(end.freestyle?.prompt).toBe('break_choice');
    expect(end.accumulatedMs).toBe(5 * 60 * 1000);
  });

  it('FREESTYLE_END_WORK with breaks DISABLED ends session immediately', () => {
    const noBreaks: TimerState = { ...freestyleIdle, freestyleBreaksEnabled: false };
    const inWork = timerReducer(noBreaks, { type: 'START_FREESTYLE', now: NOW, targetMs: 0 });
    const end = timerReducer(inWork, { type: 'FREESTYLE_END_WORK', now: NOW + 5 * 60 * 1000 });
    expect(end.status).toBe('idle');
    expect(end.freestyle).toBeNull();
  });

  it('FREESTYLE_START_BREAK transitions to break period with earned+banked total', () => {
    const inWork = timerReducer(freestyleIdle, { type: 'START_FREESTYLE', now: NOW, targetMs: 0 });
    const endWork = timerReducer(inWork, { type: 'FREESTYLE_END_WORK', now: NOW + 5 * 60 * 1000 });
    const startBreak = timerReducer(endWork, { type: 'FREESTYLE_START_BREAK', now: NOW + 5 * 60 * 1000 + 100 });
    // 5 min / ratio 5 = 60_000 ms break, no banked
    expect(startBreak.status).toBe('running');
    expect(startBreak.freestyle?.periodType).toBe('break');
    expect(startBreak.totalMs).toBe(60_000);
    expect(startBreak.freestyle?.prompt).toBe('none');
  });

  it('FREESTYLE_SKIP_BREAK banks earned (when accumulation ON), goes between periods', () => {
    const inWork = timerReducer(freestyleIdle, { type: 'START_FREESTYLE', now: NOW, targetMs: 0 });
    const endWork = timerReducer(inWork, { type: 'FREESTYLE_END_WORK', now: NOW + 5 * 60 * 1000 });
    const skip = timerReducer(endWork, { type: 'FREESTYLE_SKIP_BREAK', now: NOW + 5 * 60 * 1000 + 100 });
    expect(skip.status).toBe('completed');
    expect(skip.freestyle?.periodType).toBe('work');
    expect(skip.freestyle?.bankedMs).toBe(60_000);
  });

  it('FREESTYLE_SKIP_BREAK with accumulation OFF discards earned', () => {
    const noAccum: TimerState = { ...freestyleIdle, freestyleAccumulation: false };
    const inWork = timerReducer(noAccum, { type: 'START_FREESTYLE', now: NOW, targetMs: 0 });
    const endWork = timerReducer(inWork, { type: 'FREESTYLE_END_WORK', now: NOW + 5 * 60 * 1000 });
    const skip = timerReducer(endWork, { type: 'FREESTYLE_SKIP_BREAK', now: NOW + 5 * 60 * 1000 + 100 });
    expect(skip.freestyle?.bankedMs).toBe(0);
  });

  it('PERIOD_COMPLETE on break → between-periods (status=completed, periodType=work)', () => {
    const inBreak: TimerState = {
      ...freestyleIdle,
      status: 'running',
      totalMs: 60_000,
      freestyle: { periodType: 'break', targetMs: 0, targetReached: false, bankedMs: 0, prompt: 'none' },
    };
    const completed = timerReducer(inBreak, { type: 'PERIOD_COMPLETE', now: NOW });
    expect(completed.status).toBe('completed');
    expect(completed.freestyle?.periodType).toBe('work');
  });

  it('ABANDON in Freestyle clears state', () => {
    const inWork = timerReducer(freestyleIdle, { type: 'START_FREESTYLE', now: NOW, targetMs: 0 });
    const abandoned = timerReducer(inWork, { type: 'ABANDON' });
    expect(abandoned.status).toBe('idle');
    expect(abandoned.freestyle).toBeNull();
  });

  it('END_SESSION in Freestyle clears state', () => {
    const inBreak: TimerState = {
      ...freestyleIdle,
      status: 'running',
      freestyle: { periodType: 'break', targetMs: 0, targetReached: false, bankedMs: 0, prompt: 'none' },
    };
    const ended = timerReducer(inBreak, { type: 'END_SESSION' });
    expect(ended.status).toBe('idle');
    expect(ended.freestyle).toBeNull();
  });

  it('SET_FREESTYLE_RATIO updates state and enforces 2-decimal precision', () => {
    const s = timerReducer(initialTimerState, { type: 'SET_FREESTYLE_RATIO', value: 3.456 });
    expect(s.freestyleRatio).toBe(3.46);
  });

  it('SET_FREESTYLE_RATIO rejects zero or negative', () => {
    const s = timerReducer(initialTimerState, { type: 'SET_FREESTYLE_RATIO', value: 0 });
    expect(s.freestyleRatio).toBe(initialTimerState.freestyleRatio);
  });

  it('SET_FREESTYLE_ACCUMULATION updates flag', () => {
    const s = timerReducer(initialTimerState, { type: 'SET_FREESTYLE_ACCUMULATION', value: false });
    expect(s.freestyleAccumulation).toBe(false);
  });
});

describe('timerReducer — ADJUST_TOTAL mid-session', () => {
  it('extends totalMs while running', () => {
    const running = timerReducer(initialTimerState, { type: 'START', now: NOW });
    const adjusted = timerReducer(running, { type: 'ADJUST_TOTAL', deltaMs: 60_000 });
    expect(adjusted.totalMs).toBe(initialTimerState.totalMs + 60_000);
    expect(adjusted.status).toBe('running');
    expect(adjusted.startTimestamp).toBe(NOW);
  });

  it('shortens totalMs while paused', () => {
    const running = timerReducer(initialTimerState, { type: 'START', now: NOW });
    const paused = timerReducer(running, { type: 'PAUSE', now: NOW + 5000 });
    const adjusted = timerReducer(paused, { type: 'ADJUST_TOTAL', deltaMs: -60_000 });
    expect(adjusted.totalMs).toBe(initialTimerState.totalMs - 60_000);
    expect(adjusted.status).toBe('paused');
    expect(adjusted.accumulatedMs).toBe(5000);
  });

  it('floors totalMs at 1 second on excessive negative delta', () => {
    const running = timerReducer(initialTimerState, { type: 'START', now: NOW });
    const adjusted = timerReducer(running, { type: 'ADJUST_TOTAL', deltaMs: -999_999_999 });
    expect(adjusted.totalMs).toBe(1000);
  });

  it('is no-op when idle', () => {
    const adjusted = timerReducer(initialTimerState, { type: 'ADJUST_TOTAL', deltaMs: 60_000 });
    expect(adjusted.totalMs).toBe(initialTimerState.totalMs);
  });

  it('is no-op when completed', () => {
    const completed: TimerState = { ...initialTimerState, status: 'completed' };
    const adjusted = timerReducer(completed, { type: 'ADJUST_TOTAL', deltaMs: 60_000 });
    expect(adjusted.totalMs).toBe(initialTimerState.totalMs);
  });
});

describe('timerReducer — SET_DURATION rounds to second', () => {
  it('rounds 1.567 minutes to 94 seconds (94000 ms)', () => {
    const s = timerReducer(initialTimerState, { type: 'SET_DURATION', minutes: 1.567 });
    expect(s.totalMs).toBe(94_000);
  });
  it('keeps whole-minute inputs exact', () => {
    const s = timerReducer(initialTimerState, { type: 'SET_DURATION', minutes: 25 });
    expect(s.totalMs).toBe(25 * 60 * 1000);
  });
});

describe('timerReducer — auto-start preferences', () => {
  it('SET_AUTO_START_BREAKS updates flag', () => {
    const s = timerReducer(initialTimerState, { type: 'SET_AUTO_START_BREAKS', value: true });
    expect(s.autoStartBreaks).toBe(true);
  });
  it('SET_AUTO_START_POMODOROS updates flag', () => {
    const s = timerReducer(initialTimerState, { type: 'SET_AUTO_START_POMODOROS', value: true });
    expect(s.autoStartPomodoros).toBe(true);
  });
});

describe('timerReducer — mode-switch state isolation (Phase 2 mid-fix)', () => {
  it('SELECT_MODE → freestyle resets totalMs to 0 (stopwatch idle)', () => {
    const s = timerReducer(initialTimerState, { type: 'SELECT_MODE', mode: 'freestyle' });
    expect(s.totalMs).toBe(0);
    expect(s.accumulatedMs).toBe(0);
  });
  it('SELECT_MODE → pomodoro restores totalMs to pomodoroWorkMs', () => {
    const fromFreestyle: TimerState = { ...initialTimerState, mode: 'freestyle', totalMs: 0 };
    const s = timerReducer(fromFreestyle, { type: 'SELECT_MODE', mode: 'pomodoro' });
    expect(s.totalMs).toBe(fromFreestyle.pomodoroWorkMs);
  });
  it('SELECT_MODE → timer restores totalMs to timerDurationMs', () => {
    const fromPomodoro: TimerState = { ...initialTimerState, mode: 'pomodoro', totalMs: 25 * 60 * 1000, timerDurationMs: 17 * 60 * 1000 };
    const s = timerReducer(fromPomodoro, { type: 'SELECT_MODE', mode: 'timer' });
    expect(s.totalMs).toBe(17 * 60 * 1000);
  });
  it('SET_DURATION in Timer mode persists value to timerDurationMs', () => {
    const s = timerReducer(initialTimerState, { type: 'SET_DURATION', minutes: 12 });
    expect(s.totalMs).toBe(12 * 60 * 1000);
    expect(s.timerDurationMs).toBe(12 * 60 * 1000);
  });
  it('SET_DURATION in Pomodoro mode does NOT touch timerDurationMs', () => {
    const pomo: TimerState = { ...initialTimerState, mode: 'pomodoro' };
    const s = timerReducer(pomo, { type: 'SET_DURATION', minutes: 12 });
    expect(s.totalMs).toBe(12 * 60 * 1000);
    expect(s.timerDurationMs).toBe(initialTimerState.timerDurationMs);
  });
});

describe('timerReducer — SET_DURATION while paused (click-to-edit fix)', () => {
  it('updates totalMs and clears accumulatedMs (new value = time left)', () => {
    const paused: TimerState = { ...initialTimerState, status: 'paused', totalMs: 25 * 60 * 1000, accumulatedMs: 8 * 60 * 1000 };
    const s = timerReducer(paused, { type: 'SET_DURATION', minutes: 10 });
    expect(s.totalMs).toBe(10 * 60 * 1000);
    expect(s.accumulatedMs).toBe(0);
    expect(s.status).toBe('paused');
  });
  it('also works in completed state (between Pomodoro periods)', () => {
    const completed: TimerState = { ...initialTimerState, status: 'completed', totalMs: 5 * 60 * 1000, accumulatedMs: 5 * 60 * 1000 };
    const s = timerReducer(completed, { type: 'SET_DURATION', minutes: 7 });
    expect(s.totalMs).toBe(7 * 60 * 1000);
    expect(s.accumulatedMs).toBe(0);
  });
  it('is ignored while running', () => {
    const running: TimerState = { ...initialTimerState, status: 'running', totalMs: 25 * 60 * 1000 };
    const s = timerReducer(running, { type: 'SET_DURATION', minutes: 99 });
    expect(s.totalMs).toBe(25 * 60 * 1000);
  });
});

describe('timerReducer — SET_POMODORO_DURATIONS live-syncs idle Pomodoro display', () => {
  it('updates totalMs to new workMs when idle pomodoro with no in-progress session', () => {
    const idle: TimerState = { ...initialTimerState, mode: 'pomodoro' };
    const s = timerReducer(idle, {
      type: 'SET_POMODORO_DURATIONS',
      workMs: 30 * 60 * 1000, shortBreakMs: 5 * 60 * 1000, longBreakMs: 20 * 60 * 1000, longBreakEvery: 4,
    });
    expect(s.totalMs).toBe(30 * 60 * 1000);
    expect(s.pomodoroWorkMs).toBe(30 * 60 * 1000);
  });
  it('does NOT touch totalMs while a Pomodoro session is in progress', () => {
    const running: TimerState = { ...initialTimerState, mode: 'pomodoro', status: 'running', totalMs: 25 * 60 * 1000, pomodoro: { periodType: 'work', workCount: 0 } };
    const s = timerReducer(running, {
      type: 'SET_POMODORO_DURATIONS',
      workMs: 30 * 60 * 1000, shortBreakMs: 5 * 60 * 1000, longBreakMs: 20 * 60 * 1000, longBreakEvery: 4,
    });
    expect(s.totalMs).toBe(25 * 60 * 1000); // current period preserved
    expect(s.pomodoroWorkMs).toBe(30 * 60 * 1000); // setting still updated
  });
  it('does NOT touch totalMs when Timer mode is active (only Pomodoro idle live-syncs)', () => {
    const idleTimer = initialTimerState; // mode = 'timer'
    const s = timerReducer(idleTimer, {
      type: 'SET_POMODORO_DURATIONS',
      workMs: 30 * 60 * 1000, shortBreakMs: 5 * 60 * 1000, longBreakMs: 20 * 60 * 1000, longBreakEvery: 4,
    });
    expect(s.totalMs).toBe(initialTimerState.totalMs);
  });
});

describe('timerReducer — currentSessionId (Phase 3 Rollout 2)', () => {
  it('initialTimerState has currentSessionId: null', () => {
    expect(initialTimerState.currentSessionId).toBeNull();
  });

  it('SET_SESSION_ID sets the value', () => {
    const s = timerReducer(initialTimerState, { type: 'SET_SESSION_ID', sessionId: 'abc-123' });
    expect(s.currentSessionId).toBe('abc-123');
  });

  it('SET_SESSION_ID with null clears it', () => {
    const withId: TimerState = { ...initialTimerState, currentSessionId: 'abc-123' };
    const s = timerReducer(withId, { type: 'SET_SESSION_ID', sessionId: null });
    expect(s.currentSessionId).toBeNull();
  });

  it('END_SESSION clears currentSessionId', () => {
    const live: TimerState = {
      ...initialTimerState,
      status: 'running',
      currentSessionId: 'abc-123',
    };
    const s = timerReducer(live, { type: 'END_SESSION' });
    expect(s.currentSessionId).toBeNull();
  });

  it('ABANDON clears currentSessionId', () => {
    const live: TimerState = {
      ...initialTimerState,
      status: 'running',
      currentSessionId: 'abc-123',
    };
    const s = timerReducer(live, { type: 'ABANDON' });
    expect(s.currentSessionId).toBeNull();
  });
});

describe('timerReducer — reflection status (Phase 3 Rollout 3)', () => {
  it('initial state has reflection fields null/clear', () => {
    expect(initialTimerState.reflectionType).toBeNull();
    expect(initialTimerState.reflectionPeriodNumber).toBeNull();
    expect(initialTimerState.nextPeriodKindAfterReflection).toBeNull();
    expect(initialTimerState.currentPeriodTasksSnapshot).toBeNull();
    expect(initialTimerState.sessionTasksSnapshot).toBeNull();
  });

  it('WORK_PERIOD_DONE transitions to reflecting + records type + period + next-kind', () => {
    const live: TimerState = {
      ...initialTimerState,
      mode: 'pomodoro',
      status: 'running',
      pomodoro: { periodType: 'work', workCount: 0 },
    };
    const s = timerReducer(live, { type: 'WORK_PERIOD_DONE', now: 100, nextPeriodKind: 'short_break' });
    expect(s.status).toBe('reflecting');
    expect(s.reflectionType).toBe('per_period');
    expect(s.reflectionPeriodNumber).toBe(1); // workCount + 1
    expect(s.nextPeriodKindAfterReflection).toBe('short_break');
  });

  it('WORK_PERIOD_DONE in Timer mode records period_number=1', () => {
    const live: TimerState = { ...initialTimerState, mode: 'timer', status: 'running' };
    const s = timerReducer(live, { type: 'WORK_PERIOD_DONE', now: 100, nextPeriodKind: 'session_end' });
    expect(s.status).toBe('reflecting');
    expect(s.reflectionPeriodNumber).toBe(1);
  });

  it('REFLECTION_SUBMITTED with nextPeriodKind=session_end transitions to reflecting (session variant)', () => {
    const live: TimerState = {
      ...initialTimerState,
      mode: 'pomodoro',
      status: 'reflecting',
      reflectionType: 'per_period',
      reflectionPeriodNumber: 1,
      nextPeriodKindAfterReflection: 'session_end',
      pomodoro: { periodType: 'work', workCount: 0 },
    };
    const s = timerReducer(live, { type: 'REFLECTION_SUBMITTED' });
    expect(s.status).toBe('reflecting');
    expect(s.reflectionType).toBe('session');
    expect(s.reflectionPeriodNumber).toBeNull();
  });

  it('REFLECTION_SUBMITTED with nextPeriodKind=short_break exits reflection + completes period', () => {
    const live: TimerState = {
      ...initialTimerState,
      mode: 'pomodoro',
      status: 'reflecting',
      reflectionType: 'per_period',
      reflectionPeriodNumber: 1,
      nextPeriodKindAfterReflection: 'short_break',
      pomodoro: { periodType: 'work', workCount: 0 },
    };
    const s = timerReducer(live, { type: 'REFLECTION_SUBMITTED' });
    expect(s.status).toBe('completed');
    expect(s.pomodoro?.periodType).toBe('short_break');
    expect(s.pomodoro?.workCount).toBe(1);
    expect(s.reflectionType).toBeNull();
  });

  it('REFLECTION_SKIPPED behaves identically to SUBMITTED for state transitions', () => {
    const live: TimerState = {
      ...initialTimerState,
      mode: 'pomodoro',
      status: 'reflecting',
      reflectionType: 'per_period',
      reflectionPeriodNumber: 2,
      nextPeriodKindAfterReflection: 'long_break',
      pomodoro: { periodType: 'work', workCount: 3 },
    };
    const submitted = timerReducer(live, { type: 'REFLECTION_SUBMITTED' });
    const skipped = timerReducer(live, { type: 'REFLECTION_SKIPPED' });
    expect(submitted.status).toBe(skipped.status);
    expect(submitted.pomodoro?.periodType).toBe(skipped.pomodoro?.periodType);
  });

  it('REFLECTION_SUBMITTED on session reflection returns to idle', () => {
    const live: TimerState = {
      ...initialTimerState,
      mode: 'pomodoro',
      status: 'reflecting',
      reflectionType: 'session',
      reflectionPeriodNumber: null,
      nextPeriodKindAfterReflection: null,
      currentSessionId: 'abc-123',
      currentPeriodTasksSnapshot: [{ id: 't1', name: 'one' }],
      sessionTasksSnapshot: [{ id: 't1', name: 'one' }],
      pomodoro: { periodType: 'work', workCount: 4 },
    };
    const s = timerReducer(live, { type: 'REFLECTION_SUBMITTED' });
    expect(s.status).toBe('idle');
    expect(s.reflectionType).toBeNull();
    expect(s.currentSessionId).toBeNull();
    expect(s.currentPeriodTasksSnapshot).toBeNull();
    expect(s.sessionTasksSnapshot).toBeNull();
    expect(s.pomodoro).toBeNull();
  });

  it('END_SESSION_WITH_REFLECTION transitions to reflecting (session variant)', () => {
    const live: TimerState = {
      ...initialTimerState,
      status: 'running',
      mode: 'pomodoro',
      pomodoro: { periodType: 'work', workCount: 2 },
    };
    const s = timerReducer(live, { type: 'END_SESSION_WITH_REFLECTION' });
    expect(s.status).toBe('reflecting');
    expect(s.reflectionType).toBe('session');
    expect(s.reflectionPeriodNumber).toBeNull();
  });

  it('SET_PERIOD_TASKS_SNAPSHOT replaces current snapshot and accumulates session snapshot', () => {
    const s1 = timerReducer(initialTimerState, {
      type: 'SET_PERIOD_TASKS_SNAPSHOT',
      tasks: [{ id: 'a', name: 'Alpha' }],
    });
    expect(s1.currentPeriodTasksSnapshot).toEqual([{ id: 'a', name: 'Alpha' }]);
    expect(s1.sessionTasksSnapshot).toEqual([{ id: 'a', name: 'Alpha' }]);

    // Next period: 'a' carried over (same id), 'b' added.
    const s2 = timerReducer(s1, {
      type: 'SET_PERIOD_TASKS_SNAPSHOT',
      tasks: [{ id: 'a', name: 'Alpha' }, { id: 'b', name: 'Beta' }],
    });
    expect(s2.currentPeriodTasksSnapshot?.map((t) => t.id)).toEqual(['a', 'b']);
    expect(s2.sessionTasksSnapshot?.map((t) => t.id).sort()).toEqual(['a', 'b']);
  });

  it('END_SESSION clears all reflection and snapshot fields', () => {
    const live: TimerState = {
      ...initialTimerState,
      status: 'reflecting',
      reflectionType: 'session',
      reflectionPeriodNumber: 1,
      nextPeriodKindAfterReflection: 'short_break',
      currentPeriodTasksSnapshot: [{ id: 't1', name: 'one' }],
      sessionTasksSnapshot: [{ id: 't1', name: 'one' }],
    };
    const s = timerReducer(live, { type: 'END_SESSION' });
    expect(s.status).toBe('idle');
    expect(s.reflectionType).toBeNull();
    expect(s.reflectionPeriodNumber).toBeNull();
    expect(s.nextPeriodKindAfterReflection).toBeNull();
    expect(s.currentPeriodTasksSnapshot).toBeNull();
    expect(s.sessionTasksSnapshot).toBeNull();
  });
});
