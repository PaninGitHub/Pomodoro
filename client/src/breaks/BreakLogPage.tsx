// F-18: read-only break log viewer, day-grouped.
//
// Day grouping is local-calendar (not UTC) so users see the calendar
// dates their device shows. The grouping logic mirrors
// reflections/grouping.ts groupByDay — kept inline here rather than
// refactoring the reflection helpers to be generic, since this page has
// no view-toggle (day only) and no filters yet (spec scope). If
// week/month toggles or filters get added later, extract a shared
// generic groupByDay<T>(rows, getDate) under client/src/utils/grouping.ts
// and update both consumers.

import { useMemo } from 'react';
import { useBreakLogsList } from './useBreakLogsList';
import type { ClientBreakLog } from './breakTypes';

interface DayGroup {
  key: string;
  label: string;
  items: ClientBreakLog[];
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function groupByDay(rows: ClientBreakLog[]): DayGroup[] {
  const seen = new Map<string, DayGroup>();
  const out: DayGroup[] = [];
  for (const r of rows) {
    const d = new Date(r.break_started_at);
    const key = localDateKey(d);
    let g = seen.get(key);
    if (!g) {
      g = {
        key,
        label: d.toLocaleDateString(undefined, {
          weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
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

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: 'numeric', minute: '2-digit',
  });
}

function formatDuration(startIso: string, endIso: string | null): string {
  if (!endIso) return '(in progress)';
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  if (ms < 0) return '—';
  const totalSeconds = Math.round(ms / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  if (mins === 0) return `${secs}s`;
  if (secs === 0) return `${mins} min`;
  return `${mins} min ${secs}s`;
}

export function BreakLogPage(): JSX.Element {
  const { break_logs, loading, error } = useBreakLogsList();
  const groups = useMemo(() => groupByDay(break_logs), [break_logs]);

  return (
    <div className="w-full max-w-2xl mx-auto p-4 md:p-8 flex flex-col gap-4">
      <h2 className="text-2xl text-text-primary">Break log</h2>
      <p className="text-sm text-text-secondary">
        Every break you took (Pomodoro and Freestyle modes), most recent first.
      </p>

      {loading && (
        <p className="text-sm text-text-secondary">Loading…</p>
      )}

      {error && (
        <p role="alert" className="text-sm text-error">
          Couldn’t load break log: {error}
        </p>
      )}

      {!loading && !error && break_logs.length === 0 && (
        <p className="text-sm text-text-secondary italic">
          No break logs yet. They appear here after you take a break in Pomodoro or Freestyle mode.
        </p>
      )}

      {groups.map((g) => (
        <section key={g.key} className="flex flex-col gap-2">
          <h3 className="text-sm uppercase tracking-widest text-text-secondary border-b border-border pb-1">
            {g.label}
          </h3>
          <ul className="flex flex-col gap-2 list-none p-0 m-0">
            {g.items.map((log) => (
              <li
                key={log.id}
                className="px-3 py-2 border border-border rounded bg-bg-secondary flex justify-between items-center gap-3"
              >
                <div className="flex flex-col">
                  <span className="text-text-primary text-sm">
                    {log.activity_name ?? <em className="text-text-secondary not-italic">No activity</em>}
                  </span>
                  <span className="text-xs text-text-secondary">
                    Started {formatTime(log.break_started_at)}
                  </span>
                </div>
                <span className="text-xs text-text-secondary whitespace-nowrap">
                  {formatDuration(log.break_started_at, log.break_ended_at)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
