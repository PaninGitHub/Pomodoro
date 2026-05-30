import { describe, it, expect } from 'vitest';
import { groupByDay, groupByWeek, groupByMonth } from './grouping';
import type { ReflectionRow } from './reflectionTypes';

// Fixed test fixtures so timezone handling is the only variable.
// Note: created_at parses in local time when constructed without a
// trailing Z. We deliberately use local times so the day boundaries
// match the user's calendar (which is also how the page renders).
function row(id: string, createdAt: string): ReflectionRow {
  return {
    id, session_id: 's', type: 'session', period_number: null,
    focus_rating: 3, answers: {}, tasks_snapshot: [],
    created_at: createdAt,
  };
}

describe('groupByDay', () => {
  it('returns one group per local-calendar day, preserving input order', () => {
    const rows = [
      row('a', '2026-05-30T15:00:00'),
      row('b', '2026-05-30T09:00:00'),
      row('c', '2026-05-29T22:00:00'),
    ];
    const groups = groupByDay(rows);
    expect(groups.length).toBe(2);
    expect(groups[0]?.items.map((r) => r.id)).toEqual(['a', 'b']);
    expect(groups[1]?.items.map((r) => r.id)).toEqual(['c']);
  });

  it('empty input returns empty array', () => {
    expect(groupByDay([])).toEqual([]);
  });
});

describe('groupByWeek', () => {
  // 2026-05-26 = Tuesday, 2026-05-31 = Sunday.
  // Sunday-start week containing 2026-05-26: 2026-05-24 (Sun) – 2026-05-30 (Sat)
  // Sunday-start week containing 2026-05-31: 2026-05-31 (Sun) – 2026-06-06 (Sat)
  // Monday-start week containing 2026-05-26: 2026-05-25 (Mon) – 2026-05-31 (Sun)
  // Monday-start week containing 2026-06-01: 2026-06-01 (Mon) – 2026-06-07 (Sun)

  it('Sunday-start: items on Sat + Sun split across two weeks', () => {
    const rows = [
      row('sat', '2026-05-30T15:00:00'),  // Saturday
      row('sun', '2026-05-31T09:00:00'),  // Sunday — new week starts
    ];
    const groups = groupByWeek(rows, 'sunday');
    expect(groups.length).toBe(2);
    expect(groups[0]?.items[0]?.id).toBe('sat');
    expect(groups[1]?.items[0]?.id).toBe('sun');
  });

  it('Monday-start: items on Sat + Sun stay in the same week', () => {
    const rows = [
      row('sat', '2026-05-30T15:00:00'),  // Saturday
      row('sun', '2026-05-31T09:00:00'),  // Sunday — same Monday-start week
    ];
    const groups = groupByWeek(rows, 'monday');
    expect(groups.length).toBe(1);
    expect(groups[0]?.items.length).toBe(2);
  });

  it('Monday-start: Sunday joins the prior week, Monday starts a new one', () => {
    const rows = [
      row('sun', '2026-05-31T09:00:00'),  // Sunday — end of Mon-Sun week
      row('mon', '2026-06-01T09:00:00'),  // Monday — new Mon-Sun week
    ];
    const groups = groupByWeek(rows, 'monday');
    expect(groups.length).toBe(2);
    expect(groups[0]?.items[0]?.id).toBe('sun');
    expect(groups[1]?.items[0]?.id).toBe('mon');
  });
});

describe('groupByMonth', () => {
  it('groups by calendar month-year', () => {
    const rows = [
      row('a', '2026-05-15T10:00:00'),
      row('b', '2026-05-01T10:00:00'),
      row('c', '2026-04-30T10:00:00'),
    ];
    const groups = groupByMonth(rows);
    expect(groups.length).toBe(2);
    expect(groups[0]?.items.length).toBe(2); // May
    expect(groups[1]?.items.length).toBe(1); // April
  });
});
