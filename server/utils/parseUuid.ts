const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ParseUuidResult = { ok: true; value: string } | { ok: false };

export function parseUuid(input: unknown): ParseUuidResult {
  if (typeof input !== 'string') return { ok: false };
  if (!UUID_RE.test(input)) return { ok: false };
  return { ok: true, value: input.toLowerCase() };
}
