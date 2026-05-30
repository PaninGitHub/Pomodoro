// Group helpers for ReflectionLogPage's view toggle (day / week / month).
//
// All three return the same shape so the page renderer doesn't branch on
// view — it just iterates `groups`. Each grouper preserves the input's
// order, so newest-first input yields newest-first groups (assuming the
// server returns rows DESC, which GET /api/reflections does).

import type { ReflectionRow } from './reflectionTypes';

export interface Group {
  key: string;        // stable key for React reconciliation
  label: string;      // user-visible heading
  items: ReflectionRow[];
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

// Local YYYY-MM-DD (not UTC) so users in any timezone see the calendar
// dates they expect.
function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function groupByDay(rows: ReflectionRow[]): Group[] {
  const seen = new Map<string, Group>();
  const out: Group[] = [];
  for (const r of rows) {
    const d = new Date(r.created_at);
    const key = localDateKey(d);
    let g = seen.get(key);
    if (!g) {
      g = {
        key,
        label: d.toLocaleDateString(undefined, {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        }),
        items: [],
      };
      seen.set(key, g);
      out.push(g);
    }
    g.items.push(r);
  }
  return out;
}

// Returns a NEW Date set to midnight on the first day of the week
// containing `date`, given the user's week_start preference.
function startOfWeek(date: Date, weekStart: 'sunday' | 'monday'): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 = Sunday, 6 = Saturday
  // Days to subtract to reach the week's first day.
  const offset = weekStart === 'sunday' ? day : (day === 0 ? 6 : day - 1);
  d.setDate(d.getDate() - offset);
  return d;
}

export function groupByWeek(
  rows: ReflectionRow[],
  weekStart: 'sunday' | 'monday',
): Group[] {
  const seen = new Map<string, Group>();
  const out: Group[] = [];
  for (const r of rows) {
    const created = new Date(r.created_at);
    const weekStartDate = startOfWeek(created, weekStart);
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 6);
    const key = localDateKey(weekStartDate);
    let g = seen.get(key);
    if (!g) {
      // "May 26 – Jun 1, 2026" — locale-formatted.
      const startLabel = weekStartDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const endLabel = weekEndDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      g = {
        key,
        label: `Week of ${startLabel} – ${endLabel}`,
        items: [],
      };
      seen.set(key, g);
      out.push(g);
    }
    g.items.push(r);
  }
  return out;
}

export function groupByMonth(rows: ReflectionRow[]): Group[] {
  const seen = new Map<string, Group>();
  const out: Group[] = [];
  for (const r of rows) {
    const d = new Date(r.created_at);
    const key = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
    let g = seen.get(key);
    if (!g) {
      g = {
        key,
        label: d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
        items: [],
      };
      seen.set(key, g);
      out.push(g);
    }
    g.items.push(r);
  }
  return out;
}
