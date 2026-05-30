import { parseUuid } from './parseUuid';
import {
  ALL_PROMPT_KEYS, HINDRANCE_OPTIONS, FREE_TEXT_MAX,
  type PromptKey, type HindranceOption,
} from '../config/reflectionPrompts';
import type { ReflectionType, ReflectionAnswers, ReflectionTaskSnapshotEntry } from '../types/db';

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

const PROMPT_KEY_SET = new Set<string>(ALL_PROMPT_KEYS);
const HINDRANCE_SET = new Set<string>(HINDRANCE_OPTIONS);
const TYPES = new Set<string>(['per_period', 'session']);
const ARRAY_KEYS = new Set<PromptKey>(['hindrance_options']);

interface ValidatedReflection {
  session_id: string;
  type: ReflectionType;
  period_number: number | null;
  focus_rating: number | null;
  answers: ReflectionAnswers;
  tasks_snapshot: ReflectionTaskSnapshotEntry[];
}

function validateAnswers(input: unknown): Result<ReflectionAnswers> {
  if (input === null || input === undefined) return { ok: true, value: {} };
  if (typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, error: 'answers must be an object.' };
  }
  const out: ReflectionAnswers = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (!PROMPT_KEY_SET.has(k)) {
      return { ok: false, error: `Unknown answer key: ${k}.` };
    }
    if (ARRAY_KEYS.has(k as PromptKey)) {
      if (!Array.isArray(v) || !v.every((x) => typeof x === 'string' && HINDRANCE_SET.has(x))) {
        return { ok: false, error: `${k} must be an array of: ${HINDRANCE_OPTIONS.join(', ')}.` };
      }
      out[k as PromptKey] = v as HindranceOption[];
    } else {
      if (typeof v !== 'string') {
        return { ok: false, error: `${k} must be a string.` };
      }
      if (v.length > FREE_TEXT_MAX) {
        return { ok: false, error: `${k} must be ${FREE_TEXT_MAX} characters or fewer.` };
      }
      out[k as PromptKey] = v;
    }
  }
  return { ok: true, value: out };
}

function validateTasksSnapshot(input: unknown): Result<ReflectionTaskSnapshotEntry[]> {
  if (!Array.isArray(input)) return { ok: false, error: 'tasks_snapshot must be an array.' };
  const out: ReflectionTaskSnapshotEntry[] = [];
  for (const entry of input) {
    if (typeof entry !== 'object' || entry === null) {
      return { ok: false, error: 'tasks_snapshot entries must be objects.' };
    }
    const e = entry as Record<string, unknown>;
    const tid = parseUuid(e.task_id);
    if (!tid.ok) return { ok: false, error: 'tasks_snapshot.task_id must be a UUID.' };
    if (typeof e.name !== 'string' || e.name.length === 0 || e.name.length > 64) {
      return { ok: false, error: 'tasks_snapshot.name must be a non-empty string up to 64 chars.' };
    }
    if (typeof e.is_complete !== 'boolean') {
      return { ok: false, error: 'tasks_snapshot.is_complete must be a boolean.' };
    }
    if (typeof e.added_during_period !== 'boolean') {
      return { ok: false, error: 'tasks_snapshot.added_during_period must be a boolean.' };
    }
    out.push({ task_id: tid.value, name: e.name, is_complete: e.is_complete, added_during_period: e.added_during_period });
  }
  return { ok: true, value: out };
}

export function validateCreateReflection(body: unknown): Result<ValidatedReflection> {
  if (typeof body !== 'object' || body === null) return { ok: false, error: 'Invalid request body.' };
  const b = body as Record<string, unknown>;

  const sid = parseUuid(b.session_id);
  if (!sid.ok) return { ok: false, error: 'session_id must be a UUID.' };

  if (typeof b.type !== 'string' || !TYPES.has(b.type)) {
    return { ok: false, error: 'type must be one of: per_period, session.' };
  }
  const type = b.type as ReflectionType;

  let periodNumber: number | null = null;
  if (type === 'per_period') {
    if (typeof b.period_number !== 'number' || !Number.isInteger(b.period_number) || b.period_number < 1) {
      return { ok: false, error: 'period_number is required for per_period reflections.' };
    }
    periodNumber = b.period_number;
  } else if ('period_number' in b && b.period_number !== undefined && b.period_number !== null) {
    return { ok: false, error: 'period_number is only valid for per_period reflections.' };
  }

  let focusRating: number | null = null;
  if ('focus_rating' in b && b.focus_rating !== undefined && b.focus_rating !== null) {
    if (typeof b.focus_rating !== 'number' || !Number.isInteger(b.focus_rating) || b.focus_rating < 1 || b.focus_rating > 4) {
      return { ok: false, error: 'focus_rating must be an integer between 1 and 4.' };
    }
    focusRating = b.focus_rating;
  }

  const answers = validateAnswers(b.answers);
  if (!answers.ok) return answers;

  const snap = validateTasksSnapshot(b.tasks_snapshot);
  if (!snap.ok) return snap;

  // 10 KB size cap on answers JSONB (per Batch D §12.8 business rule).
  const serialized = JSON.stringify(answers.value);
  if (serialized.length > 10 * 1024) {
    return { ok: false, error: 'answers payload exceeds 10 KB.' };
  }

  return {
    ok: true,
    value: {
      session_id: sid.value,
      type,
      period_number: periodNumber,
      focus_rating: focusRating,
      answers: answers.value,
      tasks_snapshot: snap.value,
    },
  };
}
