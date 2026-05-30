import { ALL_PROMPT_KEYS, PROMPT_TEXT_MAX, type PromptKey } from '../config/reflectionPrompts';

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

const KEY_SET = new Set<string>(ALL_PROMPT_KEYS);

export interface ValidatedPromptUpdate {
  updates: Partial<Record<PromptKey, string>>;
}

export function validatePromptUpdate(body: unknown): Result<ValidatedPromptUpdate> {
  if (typeof body !== 'object' || body === null) return { ok: false, error: 'Invalid request body.' };
  const updates = (body as { updates?: unknown }).updates;
  if (typeof updates !== 'object' || updates === null || Array.isArray(updates)) {
    return { ok: false, error: 'updates must be an object.' };
  }
  const entries = Object.entries(updates as Record<string, unknown>);
  if (entries.length === 0) return { ok: false, error: 'Provide at least one prompt to update.' };
  const out: Partial<Record<PromptKey, string>> = {};
  for (const [k, v] of entries) {
    if (!KEY_SET.has(k)) return { ok: false, error: `Unknown prompt key: ${k}.` };
    if (typeof v !== 'string') return { ok: false, error: `${k} must be a string.` };
    if (v.length > PROMPT_TEXT_MAX) return { ok: false, error: `${k} must be ${PROMPT_TEXT_MAX} characters or fewer.` };
    out[k as PromptKey] = v;
  }
  return { ok: true, value: { updates: out } };
}
