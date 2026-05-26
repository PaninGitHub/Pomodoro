import { describe, it, expect } from 'vitest';
import { earnedBreakMs, roundTo15Seconds, accumulate } from './freestyleMath';

describe('earnedBreakMs', () => {
  it('calculates earned break per work elapsed', () => {
    // ratio 5:1 = 5 minutes work earns 1 minute break = 0.2x
    expect(earnedBreakMs(5 * 60 * 1000, 5)).toBe(60 * 1000);
  });
  it('partial work earns proportional break', () => {
    expect(earnedBreakMs(2.5 * 60 * 1000, 5)).toBe(30 * 1000);
  });
  it('supports decimal ratios', () => {
    // ratio 2.5:1 = 2.5 min work earns 1 min break
    expect(earnedBreakMs(2.5 * 60 * 1000, 2.5)).toBe(60 * 1000);
  });
  it('returns 0 for zero work', () => {
    expect(earnedBreakMs(0, 5)).toBe(0);
  });
});

describe('roundTo15Seconds', () => {
  it('rounds down when below halfway', () => {
    expect(roundTo15Seconds(7 * 1000)).toBe(0);
  });
  it('rounds up at halfway', () => {
    expect(roundTo15Seconds(7.5 * 1000)).toBe(15000);
  });
  it('rounds to nearest 15s', () => {
    expect(roundTo15Seconds(22 * 1000)).toBe(15000);
    expect(roundTo15Seconds(23 * 1000)).toBe(30000);
  });
  it('preserves exact multiples of 15s', () => {
    expect(roundTo15Seconds(45 * 1000)).toBe(45000);
  });
});

describe('accumulate', () => {
  it('adds banked time when accumulation is ON', () => {
    expect(accumulate(60000, 30000, true)).toBe(90000);
  });
  it('discards banked time when accumulation is OFF', () => {
    expect(accumulate(60000, 30000, false)).toBe(60000);
  });
});
