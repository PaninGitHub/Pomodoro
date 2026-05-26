export const MAX_PERIOD_MINUTES = 720;
export const MAX_PERIOD_MS = MAX_PERIOD_MINUTES * 60 * 1000;
export const PERIOD_CAP_MESSAGE = 'This period has reached the maximum of 12 hours and has been ended automatically.';

export function isPeriodOverCap(elapsedMs: number): boolean {
  return elapsedMs > MAX_PERIOD_MS;
}

export type DurationValidationResult =
  | { ok: true }
  | { ok: false; error: string };

export function validateDurationMinutesInput(minutes: number): DurationValidationResult {
  if (!Number.isFinite(minutes)) {
    return { ok: false, error: 'Please enter a valid number of minutes.' };
  }
  if (minutes <= 0) {
    return { ok: false, error: 'Please enter a time greater than 0 minutes.' };
  }
  if (minutes > MAX_PERIOD_MINUTES) {
    return { ok: false, error: 'Maximum period length is 12 hours.' };
  }
  return { ok: true };
}

/**
 * Convert a (possibly decimal) minute input into milliseconds, rounded
 * to the nearest whole second. Used by SET_DURATION dispatchers so user
 * input of e.g. 1.5 → 90,000 ms; 1.567 → 94,000 ms.
 */
export function minutesToMsRoundedToSecond(minutes: number): number {
  return Math.round(minutes * 60) * 1000;
}
