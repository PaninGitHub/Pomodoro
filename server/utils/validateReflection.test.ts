import { describe, it, expect } from 'vitest';
import { validateCreateReflection } from './validateReflection';

const SESSION_ID = '874922fe-4ceb-4c86-9fbb-fbd49a621d4e';
const TASK_ID    = '11111111-2222-3333-4444-555555555555';

describe('validateCreateReflection — happy paths', () => {
  it('accepts a minimal per_period body', () => {
    const r = validateCreateReflection({
      session_id: SESSION_ID,
      type: 'per_period',
      period_number: 1,
      focus_rating: 3,
      answers: { did_well: 'Stayed focused' },
      tasks_snapshot: [{ task_id: TASK_ID, name: 't', is_complete: true, added_during_period: false }],
    });
    expect(r.ok).toBe(true);
  });
  it('accepts a session body without period_number', () => {
    const r = validateCreateReflection({
      session_id: SESSION_ID,
      type: 'session',
      focus_rating: 4,
      answers: { accomplishment: 'Done' },
      tasks_snapshot: [],
    });
    expect(r.ok).toBe(true);
  });
  it('accepts a fully-skipped body (no answers + no rating)', () => {
    const r = validateCreateReflection({
      session_id: SESSION_ID,
      type: 'per_period',
      period_number: 1,
      answers: {},
      tasks_snapshot: [],
    });
    expect(r.ok).toBe(true);
  });
});

describe('validateCreateReflection — validation', () => {
  it('rejects malformed UUID session_id', () => {
    expect(validateCreateReflection({ session_id: 'nope', type: 'per_period', period_number: 1, answers: {}, tasks_snapshot: [] }).ok).toBe(false);
  });
  it('rejects unknown type', () => {
    expect(validateCreateReflection({ session_id: SESSION_ID, type: 'invalid', period_number: 1, answers: {}, tasks_snapshot: [] }).ok).toBe(false);
  });
  it('requires period_number iff type=per_period', () => {
    expect(validateCreateReflection({ session_id: SESSION_ID, type: 'per_period', answers: {}, tasks_snapshot: [] }).ok).toBe(false);
    expect(validateCreateReflection({ session_id: SESSION_ID, type: 'session', period_number: 1, answers: {}, tasks_snapshot: [] }).ok).toBe(false);
  });
  it('rejects out-of-range focus_rating', () => {
    expect(validateCreateReflection({ session_id: SESSION_ID, type: 'session', focus_rating: 5, answers: {}, tasks_snapshot: [] }).ok).toBe(false);
    expect(validateCreateReflection({ session_id: SESSION_ID, type: 'session', focus_rating: 0, answers: {}, tasks_snapshot: [] }).ok).toBe(false);
  });
  it('rejects unknown answers key', () => {
    expect(validateCreateReflection({
      session_id: SESSION_ID, type: 'session',
      answers: { malicious_key: 'evil' }, tasks_snapshot: [],
    }).ok).toBe(false);
  });
  it('rejects free-text answer over 500 chars', () => {
    expect(validateCreateReflection({
      session_id: SESSION_ID, type: 'session',
      answers: { accomplishment: 'x'.repeat(501) },
      tasks_snapshot: [],
    }).ok).toBe(false);
  });
  it('rejects hindrance_options that are not the known triple', () => {
    expect(validateCreateReflection({
      session_id: SESSION_ID, type: 'per_period', period_number: 1,
      answers: { hindrance_options: ['ufo'] },
      tasks_snapshot: [],
    }).ok).toBe(false);
  });
  it('accepts hindrance_options as a valid string array', () => {
    expect(validateCreateReflection({
      session_id: SESSION_ID, type: 'per_period', period_number: 1,
      answers: { hindrance_options: ['Distractions', 'Environment'] },
      tasks_snapshot: [],
    }).ok).toBe(true);
  });
  it('rejects tasks_snapshot entry missing required fields', () => {
    expect(validateCreateReflection({
      session_id: SESSION_ID, type: 'session',
      answers: {},
      tasks_snapshot: [{ task_id: TASK_ID, name: 't' /* missing is_complete + added_during_period */ }],
    }).ok).toBe(false);
  });
});
