import { describe, it, expect } from 'vitest';
import { computeRemaining, formatTime, computeElapsed } from './timerMath';

describe('computeRemaining', () => {
  it('returns totalMs when no time elapsed', () => {
    const now = 1000;
    expect(computeRemaining({ totalMs: 60000, startTimestamp: now, accumulatedMs: 0 }, now)).toBe(60000);
  });

  it('subtracts elapsed time from total', () => {
    expect(computeRemaining({ totalMs: 60000, startTimestamp: 1000, accumulatedMs: 0 }, 11000)).toBe(50000);
  });

  it('honors accumulated pause time', () => {
    // 60s total, paused with 20s already elapsed, resumed 5s ago = 25s elapsed total = 35s remaining
    expect(computeRemaining({ totalMs: 60000, startTimestamp: 5000, accumulatedMs: 20000 }, 10000)).toBe(35000);
  });

  it('never returns negative', () => {
    expect(computeRemaining({ totalMs: 60000, startTimestamp: 0, accumulatedMs: 0 }, 99999)).toBe(0);
  });
});

describe('computeElapsed', () => {
  it('returns accumulated + (now - start)', () => {
    expect(computeElapsed({ startTimestamp: 1000, accumulatedMs: 5000 }, 11000)).toBe(15000);
  });
});

describe('formatTime', () => {
  it('formats whole minutes as MM:SS', () => {
    expect(formatTime(25 * 60 * 1000)).toBe('25:00');
  });
  it('formats sub-minute as MM:SS', () => {
    expect(formatTime(45 * 1000)).toBe('00:45');
  });
  it('rounds milliseconds up', () => {
    expect(formatTime(45 * 1000 + 500)).toBe('00:46');
  });
  it('formats over-hour as HH:MM:SS', () => {
    expect(formatTime(2 * 3600 * 1000 + 5 * 60 * 1000 + 3 * 1000)).toBe('02:05:03');
  });
  it('formats 0 as 00:00', () => {
    expect(formatTime(0)).toBe('00:00');
  });
});
