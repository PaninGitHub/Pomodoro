import { describe, it, expect } from 'vitest';
import { validateCreateTask, validateUpdateTask, validateReorderIds } from './validateTask';

describe('validateCreateTask', () => {
  it('accepts a valid body', () => {
    const r = validateCreateTask({ name: 'Read chapter 3', time_estimate: 30 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual({ name: 'Read chapter 3', time_estimate: 30 });
  });
  it('rejects missing name', () => {
    expect(validateCreateTask({ time_estimate: 30 }).ok).toBe(false);
  });
  it('rejects empty name', () => {
    expect(validateCreateTask({ name: '', time_estimate: 30 }).ok).toBe(false);
    expect(validateCreateTask({ name: '   ', time_estimate: 30 }).ok).toBe(false);
  });
  it('rejects name exceeding 64 chars', () => {
    expect(validateCreateTask({ name: 'a'.repeat(65), time_estimate: 30 }).ok).toBe(false);
  });
  it('rejects non-integer time_estimate', () => {
    expect(validateCreateTask({ name: 't', time_estimate: 5.5 }).ok).toBe(false);
    expect(validateCreateTask({ name: 't', time_estimate: 'x' }).ok).toBe(false);
  });
  it('rejects out-of-range time_estimate', () => {
    expect(validateCreateTask({ name: 't', time_estimate: 0 }).ok).toBe(false);
    expect(validateCreateTask({ name: 't', time_estimate: 1441 }).ok).toBe(false);
  });
  it('accepts boundary values', () => {
    expect(validateCreateTask({ name: 't', time_estimate: 1 }).ok).toBe(true);
    expect(validateCreateTask({ name: 't', time_estimate: 1440 }).ok).toBe(true);
  });
  it('trims whitespace from name', () => {
    const r = validateCreateTask({ name: '  task  ', time_estimate: 5 });
    if (r.ok) expect(r.value.name).toBe('task');
  });
});

describe('validateUpdateTask', () => {
  it('accepts partial fields', () => {
    expect(validateUpdateTask({ name: 'new name' }).ok).toBe(true);
    expect(validateUpdateTask({ time_estimate: 60 }).ok).toBe(true);
    expect(validateUpdateTask({ is_complete: true }).ok).toBe(true);
  });
  it('strips unknown fields silently', () => {
    const r = validateUpdateTask({ name: 'x', random_field: 'y' });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual({ name: 'x' });
  });
  it('rejects empty body', () => {
    expect(validateUpdateTask({}).ok).toBe(false);
  });
  it('rejects same out-of-range values as create', () => {
    expect(validateUpdateTask({ time_estimate: 0 }).ok).toBe(false);
    expect(validateUpdateTask({ name: 'a'.repeat(65) }).ok).toBe(false);
  });
});

describe('validateReorderIds', () => {
  it('accepts non-empty array of strings', () => {
    const r = validateReorderIds(['a', 'b', 'c']);
    expect(r.ok).toBe(true);
  });
  it('rejects empty array', () => {
    expect(validateReorderIds([]).ok).toBe(false);
  });
  it('rejects non-array', () => {
    expect(validateReorderIds('not array').ok).toBe(false);
    expect(validateReorderIds(null).ok).toBe(false);
  });
  it('rejects array with non-string elements', () => {
    expect(validateReorderIds([1, 2, 3]).ok).toBe(false);
  });
});
