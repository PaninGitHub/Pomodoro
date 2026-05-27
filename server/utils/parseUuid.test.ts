import { describe, it, expect } from 'vitest';
import { parseUuid } from './parseUuid';

describe('parseUuid', () => {
  it('accepts a valid v4 UUID', () => {
    const r = parseUuid('874922fe-4ceb-4c86-9fbb-fbd49a621d4e');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe('874922fe-4ceb-4c86-9fbb-fbd49a621d4e');
  });
  it('rejects non-UUID strings', () => {
    expect(parseUuid('not-a-uuid').ok).toBe(false);
    expect(parseUuid('').ok).toBe(false);
    expect(parseUuid('874922fe').ok).toBe(false);
  });
  it('rejects non-strings', () => {
    expect(parseUuid(undefined).ok).toBe(false);
    expect(parseUuid(null).ok).toBe(false);
    expect(parseUuid(42).ok).toBe(false);
  });
  it('is case-insensitive on hex digits but normalizes to lowercase', () => {
    const r = parseUuid('874922FE-4CEB-4C86-9FBB-FBD49A621D4E');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe('874922fe-4ceb-4c86-9fbb-fbd49a621d4e');
  });
});
