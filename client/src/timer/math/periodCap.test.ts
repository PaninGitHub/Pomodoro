import { describe, it, expect } from 'vitest';
import { MAX_PERIOD_MS, MAX_PERIOD_MINUTES, isPeriodOverCap, validateDurationMinutesInput } from './periodCap';

describe('constants', () => {
  it('MAX_PERIOD_MINUTES is 720', () => expect(MAX_PERIOD_MINUTES).toBe(720));
  it('MAX_PERIOD_MS is 720 * 60 * 1000', () => expect(MAX_PERIOD_MS).toBe(720 * 60 * 1000));
});

describe('isPeriodOverCap', () => {
  it('false at exactly the cap', () => expect(isPeriodOverCap(MAX_PERIOD_MS)).toBe(false));
  it('true just over the cap', () => expect(isPeriodOverCap(MAX_PERIOD_MS + 1)).toBe(true));
  it('false well under the cap', () => expect(isPeriodOverCap(60 * 60 * 1000)).toBe(false));
});

describe('validateDurationMinutesInput', () => {
  it('accepts 1', () => expect(validateDurationMinutesInput(1)).toEqual({ ok: true }));
  it('accepts 720', () => expect(validateDurationMinutesInput(720)).toEqual({ ok: true }));
  it('rejects 0', () => {
    const r = validateDurationMinutesInput(0);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/greater than 0/i);
  });
  it('rejects negative', () => {
    expect(validateDurationMinutesInput(-5).ok).toBe(false);
  });
  it('rejects 721', () => {
    const r = validateDurationMinutesInput(721);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/12 hours/i);
  });
  it('rejects non-integer', () => {
    expect(validateDurationMinutesInput(5.5).ok).toBe(false);
  });
});
