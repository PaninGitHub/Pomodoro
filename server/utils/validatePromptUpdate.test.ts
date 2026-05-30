import { describe, it, expect } from 'vitest';
import { validatePromptUpdate } from './validatePromptUpdate';

describe('validatePromptUpdate', () => {
  it('accepts a single known key', () => {
    const r = validatePromptUpdate({ updates: { did_well: 'New text' } });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.updates.did_well).toBe('New text');
  });
  it('accepts multiple known keys', () => {
    const r = validatePromptUpdate({ updates: { did_well: 'a', accomplishment: 'b' } });
    expect(r.ok).toBe(true);
  });
  it('rejects empty updates', () => {
    expect(validatePromptUpdate({ updates: {} }).ok).toBe(false);
  });
  it('rejects unknown key', () => {
    expect(validatePromptUpdate({ updates: { bogus_key: 'x' } }).ok).toBe(false);
  });
  it('rejects text over 1280 chars', () => {
    expect(validatePromptUpdate({ updates: { did_well: 'x'.repeat(1281) } }).ok).toBe(false);
  });
  it('rejects non-string text', () => {
    expect(validatePromptUpdate({ updates: { did_well: 42 } }).ok).toBe(false);
  });
  it('rejects missing updates object', () => {
    expect(validatePromptUpdate({}).ok).toBe(false);
  });
});
