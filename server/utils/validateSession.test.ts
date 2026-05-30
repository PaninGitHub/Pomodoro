import { describe, it, expect } from 'vitest';
import { validateCreateSession, validatePatchSession } from './validateSession';

describe('validateCreateSession', () => {
  it('accepts the three known modes', () => {
    for (const mode of ['timer', 'pomodoro', 'freestyle'] as const) {
      const r = validateCreateSession({ mode });
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value.mode).toBe(mode);
    }
  });
  it('rejects unknown mode', () => {
    expect(validateCreateSession({ mode: 'unknown' }).ok).toBe(false);
  });
  it('rejects missing mode', () => {
    expect(validateCreateSession({}).ok).toBe(false);
  });
});

describe('validatePatchSession', () => {
  it('accepts ended_at + ended_early + counters', () => {
    const r = validatePatchSession({
      ended_at: '2026-05-30T12:00:00Z',
      ended_early: true,
      total_work_mins: 50,
      periods_completed: 2,
    });
    expect(r.ok).toBe(true);
  });
  it('rejects empty body', () => {
    expect(validatePatchSession({}).ok).toBe(false);
  });
  it('rejects non-ISO ended_at', () => {
    expect(validatePatchSession({ ended_at: 'not-a-date' }).ok).toBe(false);
  });
  it('rejects negative counters', () => {
    expect(validatePatchSession({ total_work_mins: -1 }).ok).toBe(false);
    expect(validatePatchSession({ periods_completed: -3 }).ok).toBe(false);
  });
});
