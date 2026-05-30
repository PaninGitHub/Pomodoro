import type { TimerSessionMode } from '../types/db';

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

const KNOWN_MODES: readonly TimerSessionMode[] = ['timer', 'pomodoro', 'freestyle'];

interface CreateSessionInput { mode: TimerSessionMode; }
interface PatchSessionInput {
  ended_at?: Date;
  ended_early?: boolean;
  total_work_mins?: number;
  periods_completed?: number;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

export function validateCreateSession(body: unknown): Result<CreateSessionInput> {
  if (!isObject(body)) return { ok: false, error: 'Invalid request body.' };
  const mode = body.mode;
  if (typeof mode !== 'string' || !KNOWN_MODES.includes(mode as TimerSessionMode)) {
    return { ok: false, error: 'mode must be one of: timer, pomodoro, freestyle.' };
  }
  return { ok: true, value: { mode: mode as TimerSessionMode } };
}

export function validatePatchSession(body: unknown): Result<PatchSessionInput> {
  if (!isObject(body)) return { ok: false, error: 'Invalid request body.' };
  const out: PatchSessionInput = {};
  if ('ended_at' in body) {
    if (typeof body.ended_at !== 'string') {
      return { ok: false, error: 'ended_at must be an ISO date string.' };
    }
    const d = new Date(body.ended_at);
    if (Number.isNaN(d.getTime())) {
      return { ok: false, error: 'ended_at must be a valid ISO date.' };
    }
    out.ended_at = d;
  }
  if ('ended_early' in body) {
    if (typeof body.ended_early !== 'boolean') {
      return { ok: false, error: 'ended_early must be a boolean.' };
    }
    out.ended_early = body.ended_early;
  }
  if ('total_work_mins' in body) {
    if (typeof body.total_work_mins !== 'number' || !Number.isInteger(body.total_work_mins) || body.total_work_mins < 0) {
      return { ok: false, error: 'total_work_mins must be a non-negative integer.' };
    }
    out.total_work_mins = body.total_work_mins;
  }
  if ('periods_completed' in body) {
    if (typeof body.periods_completed !== 'number' || !Number.isInteger(body.periods_completed) || body.periods_completed < 0) {
      return { ok: false, error: 'periods_completed must be a non-negative integer.' };
    }
    out.periods_completed = body.periods_completed;
  }
  if (Object.keys(out).length === 0) {
    return { ok: false, error: 'Provide at least one field to update.' };
  }
  return { ok: true, value: out };
}
