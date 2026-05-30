// Client-side mirror of server/types/db.ts PublicReflection — exact match
// on field names + types. Keep in sync when the server shape changes.

import type { ReflectionType, PeriodTaskSnapshot } from '../timer/state/timerReducer';
import type { PromptKey } from '../config/reflection-prompts.config';

export type { ReflectionType };

// Per-task entry as persisted in reflections.tasks_snapshot JSONB.
// Mirrors server's ReflectionTaskSnapshotEntry (with D-04's
// added_during_period extension).
export interface ReflectionTaskEntry {
  task_id: string;
  name: string;
  is_complete: boolean;
  added_during_period: boolean;
}

// Answers map — keys constrained to known prompt_key, values either a free-
// text string or (for hindrance_options) an array of HindranceOption labels.
export type ReflectionAnswers = Partial<Record<PromptKey, string | string[]>>;

// Single reflection row returned by GET /api/reflections.
// created_at arrives as an ISO string over JSON.
export interface ReflectionRow {
  id: string;
  session_id: string;
  type: ReflectionType;
  period_number: number | null;
  focus_rating: number | null;
  answers: ReflectionAnswers | null;
  tasks_snapshot: ReflectionTaskEntry[] | null;
  created_at: string;
}

// Filter shape consumed by useReflectionsList — all fields optional.
// Empty / undefined filters are omitted from the query string entirely.
export interface ReflectionFilters {
  from?: string;        // ISO date (inclusive)
  to?: string;          // ISO date (inclusive)
  focus_rating?: 1 | 2 | 3 | 4;
  task_name?: string;   // case-insensitive substring (server-side)
}

// Re-exported for callers that diff against PeriodTaskSnapshot from the
// reducer (e.g. the edit modal computing added_during_period from the
// session-wide snapshot).
export type { PeriodTaskSnapshot };
