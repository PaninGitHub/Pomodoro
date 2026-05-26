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

describe('timerReducer — Freestyle cycling', () => {
  const freestyleIdle: TimerState = {
    ...initialTimerState,
    mode: 'freestyle',
    totalMs: 5 * 60 * 1000, // 5 minute work duration set by user
  };

  it('START_FREESTYLE begins a work period and snapshots workDurationMs', () => {
    const s = timerReducer(freestyleIdle, { type: 'START_FREESTYLE', now: NOW });
    expect(s.status).toBe('running');
    expect(s.freestyle?.periodType).toBe('work');
    expect(s.freestyle?.workDurationMs).toBe(5 * 60 * 1000);
    expect(s.freestyle?.bankedMs).toBe(0);
  });

  it('PERIOD_COMPLETE on work → break with earned time (ratio 5:1, 5min → 60s, rounded to 60s)', () => {
    const inWork = timerReducer(freestyleIdle, { type: 'START_FREESTYLE', now: NOW });
    // Default ratio = 5, so 5 min work earns 1 min break.
    const completed = timerReducer(inWork, { type: 'PERIOD_COMPLETE', now: NOW + 5 * 60 * 1000 });
    expect(completed.freestyle?.periodType).toBe('break');
    expect(completed.totalMs).toBe(60 * 1000);
    expect(completed.status).toBe('running'); // auto-start break in Freestyle Phase 1
    expect(completed.startTimestamp).toBe(NOW + 5 * 60 * 1000);
  });

  it('PERIOD_COMPLETE on break → next work period, restored from workDurationMs', () => {
    const inBreak: TimerState = {
      ...freestyleIdle,
      status: 'running',
      totalMs: 60 * 1000,
      freestyle: { periodType: 'break', workDurationMs: 5 * 60 * 1000, bankedMs: 0 },
    };
    const completed = timerReducer(inBreak, { type: 'PERIOD_COMPLETE', now: NOW });
    expect(completed.freestyle?.periodType).toBe('work');
    expect(completed.totalMs).toBe(5 * 60 * 1000);
    expect(completed.status).toBe('completed'); // user clicks Start for next work
  });

  it('Earned break rounds to nearest 15s (ratio 7:1, 1 min work = 8.57s rounded to 15s)', () => {
    const oneMin: TimerState = {
      ...freestyleIdle,
      totalMs: 60 * 1000,
      freestyleRatio: 7,
    };
    const inWork = timerReducer(oneMin, { type: 'START_FREESTYLE', now: NOW });
    const completed = timerReducer(inWork, { type: 'PERIOD_COMPLETE', now: NOW + 60_000 });
    // earned raw = 60000 / 7 = 8571.43 ms; rounded to nearest 15s = 15000 ms
    expect(completed.totalMs).toBe(15_000);
  });

  it('Earned break of zero ends session (no break)', () => {
    // Extreme ratio where rounded earned is 0
    const extreme: TimerState = {
      ...freestyleIdle,
      totalMs: 1000, // 1 second work
      freestyleRatio: 1000, // 1000:1
    };
    const inWork = timerReducer(extreme, { type: 'START_FREESTYLE', now: NOW });
    const completed = timerReducer(inWork, { type: 'PERIOD_COMPLETE', now: NOW + 1000 });
    expect(completed.status).toBe('idle');
    expect(completed.freestyle).toBeNull();
  });

  it('ABANDON in Freestyle clears state', () => {
    const inWork = timerReducer(freestyleIdle, { type: 'START_FREESTYLE', now: NOW });
    const abandoned = timerReducer(inWork, { type: 'ABANDON' });
    expect(abandoned.status).toBe('idle');
    expect(abandoned.freestyle).toBeNull();
  });

  it('END_SESSION in Freestyle clears state', () => {
    const inBreak: TimerState = {
      ...freestyleIdle,
      status: 'running',
      freestyle: { periodType: 'break', workDurationMs: 5 * 60 * 1000, bankedMs: 0 },
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
