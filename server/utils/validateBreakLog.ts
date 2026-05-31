// Validators for the break_logs endpoints (F-17 + F-18).
//
// The dismiss-popup-without-selecting case is represented as activity_id
// AND activity_name both null. The select-an-activity case is both
// non-null. Mixed (one null, one not) is rejected — denormalized
// activity_name must match whether an activity was selected at all.

import { parseUuid } from './parseUuid';

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

interface ValidatedCreateBreakLog {
  session_id: string;
  activity_id: string | null;
  activity_name: string | null;
  break_started_at: Date;
}

interface ValidatedPatchBreakLog {
  break_ended_at: Date;
}

function validateIsoDate(input: unknown, field: string): Result<Date> {
  if (typeof input !== 'string') return { ok: false, error: `${field} must be an ISO date string.` };
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return { ok: false, error: `${field} must be a valid ISO date.` };
  return { ok: true, value: d };
}

export function validateCreateBreakLog(body: unknown): Result<ValidatedCreateBreakLog> {
  if (typeof body !== 'object' || body === null) return { ok: false, error: 'Invalid request body.' };
  const b = body as Record<string, unknown>;

  const sid = parseUuid(b.session_id);
  if (!sid.ok) return { ok: false, error: 'session_id must be a UUID.' };

  // activity_id / activity_name are optional, but they MUST agree:
  // both null (dismissed popup) or both non-null (selected an activity).
  let activityId: string | null = null;
  let activityName: string | null = null;
  const hasId = 'activity_id' in b && b.activity_id !== undefined && b.activity_id !== null;
  const hasName = 'activity_name' in b && b.activity_name !== undefined && b.activity_name !== null;

  if (hasId !== hasName) {
    return {
      ok: false,
      error: 'activity_id and activity_name must both be set or both be absent.',
    };
  }

  if (hasId) {
    const aid = parseUuid(b.activity_id);
    if (!aid.ok) return { ok: false, error: 'activity_id must be a UUID.' };
    activityId = aid.value;

    if (typeof b.activity_name !== 'string') {
      return { ok: false, error: 'activity_name must be a string.' };
    }
    const trimmed = (b.activity_name as string).trim();
    if (trimmed.length === 0) return { ok: false, error: 'activity_name must not be empty.' };
    if (trimmed.length > 64) return { ok: false, error: 'activity_name must be 64 characters or fewer.' };
    activityName = trimmed;
  }

  const started = validateIsoDate(b.break_started_at, 'break_started_at');
  if (!started.ok) return started;

  return {
    ok: true,
    value: {
      session_id: sid.value,
      activity_id: activityId,
      activity_name: activityName,
      break_started_at: started.value,
    },
  };
}

export function validatePatchBreakLog(body: unknown): Result<ValidatedPatchBreakLog> {
  if (typeof body !== 'object' || body === null) return { ok: false, error: 'Invalid request body.' };
  const b = body as Record<string, unknown>;

  const ended = validateIsoDate(b.break_ended_at, 'break_ended_at');
  if (!ended.ok) return ended;

  return { ok: true, value: { break_ended_at: ended.value } };
}
