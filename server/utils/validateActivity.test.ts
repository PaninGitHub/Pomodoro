import { describe, it, expect } from 'vitest';
import { validateCreateActivity, validateUpdateActivity } from './validateActivity';

describe('validateCreateActivity', () => {
  it('accepts a valid body', () => {
    const r = validateCreateActivity({ name: 'Stretch', time_estimate: 5 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual({ name: 'Stretch', time_estimate: 5 });
  });
  it('rejects non-object body', () => {
    expect(validateCreateActivity(null).ok).toBe(false);
    expect(validateCreateActivity('not an object').ok).toBe(false);
  });
  it('rejects missing name', () => {
    expect(validateCreateActivity({ time_estimate: 5 }).ok).toBe(false);
  });
  it('rejects non-string name', () => {
    expect(validateCreateActivity({ name: 42, time_estimate: 5 }).ok).toBe(false);
  });
  it('rejects empty / whitespace-only name', () => {
    expect(validateCreateActivity({ name: '', time_estimate: 5 }).ok).toBe(false);
    expect(validateCreateActivity({ name: '   ', time_estimate: 5 }).ok).toBe(false);
  });
  it('rejects name exceeding 64 chars', () => {
    expect(validateCreateActivity({ name: 'a'.repeat(65), time_estimate: 5 }).ok).toBe(false);
  });
  it('accepts name at exactly 64 chars', () => {
    expect(validateCreateActivity({ name: 'a'.repeat(64), time_estimate: 5 }).ok).toBe(true);
  });
  it('trims whitespace from name', () => {
    const r = validateCreateActivity({ name: '  Walk  ', time_estimate: 5 });
    if (r.ok) expect(r.value.name).toBe('Walk');
  });
  it('rejects non-integer time_estimate', () => {
    expect(validateCreateActivity({ name: 't', time_estimate: 5.5 }).ok).toBe(false);
    expect(validateCreateActivity({ name: 't', time_estimate: '5' }).ok).toBe(false);
  });
  it('rejects out-of-range time_estimate', () => {
    expect(validateCreateActivity({ name: 't', time_estimate: 0 }).ok).toBe(false);
    expect(validateCreateActivity({ name: 't', time_estimate: 1441 }).ok).toBe(false);
    expect(validateCreateActivity({ name: 't', time_estimate: -1 }).ok).toBe(false);
  });
  it('accepts boundary values', () => {
    expect(validateCreateActivity({ name: 't', time_estimate: 1 }).ok).toBe(true);
    expect(validateCreateActivity({ name: 't', time_estimate: 1440 }).ok).toBe(true);
  });
});

describe('validateUpdateActivity', () => {
  it('accepts name-only update', () => {
    const r = validateUpdateActivity({ name: 'Renamed' });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual({ name: 'Renamed' });
  });
  it('accepts time_estimate-only update', () => {
    const r = validateUpdateActivity({ time_estimate: 10 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual({ time_estimate: 10 });
  });
  it('accepts both fields together', () => {
    const r = validateUpdateActivity({ name: 'New', time_estimate: 7 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual({ name: 'New', time_estimate: 7 });
  });
  it('rejects empty body', () => {
    expect(validateUpdateActivity({}).ok).toBe(false);
  });
  it('rejects non-object body', () => {
    expect(validateUpdateActivity(null).ok).toBe(false);
  });
  it('strips unknown fields silently', () => {
    const r = validateUpdateActivity({ name: 'x', sort_order: 99, is_complete: true });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual({ name: 'x' });
  });
  it('rejects same out-of-range values as create', () => {
    expect(validateUpdateActivity({ name: 'a'.repeat(65) }).ok).toBe(false);
    expect(validateUpdateActivity({ time_estimate: 0 }).ok).toBe(false);
    expect(validateUpdateActivity({ time_estimate: 1441 }).ok).toBe(false);
  });
  it('trims whitespace from name on update', () => {
    const r = validateUpdateActivity({ name: '   trimmed   ' });
    if (r.ok) expect(r.value.name).toBe('trimmed');
  });
});
