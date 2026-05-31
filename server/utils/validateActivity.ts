// Validators for the break_activities CRUD endpoints (F-16).
//
// Schema rules mirror Batch D §12.6: name <= 64 chars, time_estimate
// integer 1-1440. Structure intentionally mirrors validateTask.ts so the
// two stay in lockstep — if one's rules change, audit the other.

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

interface ValidatedCreateActivity {
  name: string;
  time_estimate: number;
}
interface ValidatedUpdateActivity {
  name?: string;
  time_estimate?: number;
}

function isInt(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n);
}

function validateName(input: unknown): Result<string> {
  if (typeof input !== 'string') return { ok: false, error: 'Name must be a string.' };
  const trimmed = input.trim();
  if (trimmed.length === 0) return { ok: false, error: 'Name is required.' };
  if (trimmed.length > 64) return { ok: false, error: 'Name must be 64 characters or fewer.' };
  return { ok: true, value: trimmed };
}

function validateTimeEstimate(input: unknown): Result<number> {
  if (!isInt(input)) return { ok: false, error: 'Time estimate must be a whole number of minutes.' };
  if (input < 1 || input > 1440) {
    return { ok: false, error: 'Time estimate must be between 1 and 1440 minutes.' };
  }
  return { ok: true, value: input };
}

export function validateCreateActivity(body: unknown): Result<ValidatedCreateActivity> {
  if (typeof body !== 'object' || body === null) return { ok: false, error: 'Invalid request body.' };
  const b = body as { name?: unknown; time_estimate?: unknown };
  const name = validateName(b.name);
  if (!name.ok) return name;
  const te = validateTimeEstimate(b.time_estimate);
  if (!te.ok) return te;
  return { ok: true, value: { name: name.value, time_estimate: te.value } };
}

export function validateUpdateActivity(body: unknown): Result<ValidatedUpdateActivity> {
  if (typeof body !== 'object' || body === null) return { ok: false, error: 'Invalid request body.' };
  const b = body as Record<string, unknown>;
  const out: ValidatedUpdateActivity = {};
  if ('name' in b) {
    const n = validateName(b.name);
    if (!n.ok) return n;
    out.name = n.value;
  }
  if ('time_estimate' in b) {
    const t = validateTimeEstimate(b.time_estimate);
    if (!t.ok) return t;
    out.time_estimate = t.value;
  }
  if (Object.keys(out).length === 0) {
    return { ok: false, error: 'Provide at least one field to update.' };
  }
  return { ok: true, value: out };
}
