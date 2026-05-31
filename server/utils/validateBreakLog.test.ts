import { describe, it, expect } from 'vitest';
import { validateCreateBreakLog, validatePatchBreakLog } from './validateBreakLog';

const SESSION_ID = '11111111-1111-1111-1111-111111111111';
const ACTIVITY_ID = '22222222-2222-2222-2222-222222222222';
const ISO = '2026-05-30T12:00:00.000Z';

describe('validateCreateBreakLog', () => {
  it('accepts a complete body with activity selected', () => {
    const r = validateCreateBreakLog({
      session_id: SESSION_ID,
      activity_id: ACTIVITY_ID,
      activity_name: 'Walk',
      break_started_at: ISO,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.session_id).toBe(SESSION_ID);
      expect(r.value.activity_id).toBe(ACTIVITY_ID);
      expect(r.value.activity_name).toBe('Walk');
      expect(r.value.break_started_at).toBeInstanceOf(Date);
      expect(r.value.break_started_at.toISOString()).toBe(ISO);
    }
  });

  it('accepts dismiss-without-selecting (both nulls)', () => {
    const r = validateCreateBreakLog({
      session_id: SESSION_ID,
      activity_id: null,
      activity_name: null,
      break_started_at: ISO,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.activity_id).toBeNull();
      expect(r.value.activity_name).toBeNull();
    }
  });

  it('accepts dismiss-without-selecting (both absent)', () => {
    const r = validateCreateBreakLog({
      session_id: SESSION_ID,
      break_started_at: ISO,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.activity_id).toBeNull();
      expect(r.value.activity_name).toBeNull();
    }
  });

  it('rejects mixed nullness — id set, name absent', () => {
    expect(validateCreateBreakLog({
      session_id: SESSION_ID,
      activity_id: ACTIVITY_ID,
      break_started_at: ISO,
    }).ok).toBe(false);
  });

  it('rejects mixed nullness — name set, id null', () => {
    expect(validateCreateBreakLog({
      session_id: SESSION_ID,
      activity_id: null,
      activity_name: 'Walk',
      break_started_at: ISO,
    }).ok).toBe(false);
  });

  it('rejects missing session_id', () => {
    expect(validateCreateBreakLog({ break_started_at: ISO }).ok).toBe(false);
  });

  it('rejects non-UUID session_id', () => {
    expect(validateCreateBreakLog({
      session_id: 'not-a-uuid',
      break_started_at: ISO,
    }).ok).toBe(false);
  });

  it('rejects non-UUID activity_id', () => {
    expect(validateCreateBreakLog({
      session_id: SESSION_ID,
      activity_id: 'not-a-uuid',
      activity_name: 'Walk',
      break_started_at: ISO,
    }).ok).toBe(false);
  });

  it('rejects empty activity_name', () => {
    expect(validateCreateBreakLog({
      session_id: SESSION_ID,
      activity_id: ACTIVITY_ID,
      activity_name: '   ',
      break_started_at: ISO,
    }).ok).toBe(false);
  });

  it('rejects activity_name over 64 chars', () => {
    expect(validateCreateBreakLog({
      session_id: SESSION_ID,
      activity_id: ACTIVITY_ID,
      activity_name: 'a'.repeat(65),
      break_started_at: ISO,
    }).ok).toBe(false);
  });

  it('trims activity_name', () => {
    const r = validateCreateBreakLog({
      session_id: SESSION_ID,
      activity_id: ACTIVITY_ID,
      activity_name: '  Walk  ',
      break_started_at: ISO,
    });
    if (r.ok) expect(r.value.activity_name).toBe('Walk');
  });

  it('rejects missing break_started_at', () => {
    expect(validateCreateBreakLog({ session_id: SESSION_ID }).ok).toBe(false);
  });

  it('rejects invalid ISO date', () => {
    expect(validateCreateBreakLog({
      session_id: SESSION_ID,
      break_started_at: 'not-a-date',
    }).ok).toBe(false);
  });

  it('rejects non-object body', () => {
    expect(validateCreateBreakLog(null).ok).toBe(false);
    expect(validateCreateBreakLog('str').ok).toBe(false);
  });
});

describe('validatePatchBreakLog', () => {
  it('accepts a valid ISO break_ended_at', () => {
    const r = validatePatchBreakLog({ break_ended_at: ISO });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.break_ended_at.toISOString()).toBe(ISO);
  });

  it('rejects missing break_ended_at', () => {
    expect(validatePatchBreakLog({}).ok).toBe(false);
  });

  it('rejects invalid ISO', () => {
    expect(validatePatchBreakLog({ break_ended_at: 'not-a-date' }).ok).toBe(false);
  });

  it('rejects non-string break_ended_at', () => {
    expect(validatePatchBreakLog({ break_ended_at: 1234567890 }).ok).toBe(false);
  });

  it('rejects non-object body', () => {
    expect(validatePatchBreakLog(null).ok).toBe(false);
  });
});
