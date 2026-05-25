const FIFTEEN_SECONDS_MS = 15 * 1000;

/**
 * Earned break time given work elapsed and the freestyle ratio.
 * Ratio is X-minutes-work-per-1-minute-break (so 5:1 ratio = ratio param 5).
 */
export function earnedBreakMs(workElapsedMs: number, ratio: number): number {
  if (ratio <= 0) return 0;
  return workElapsedMs / ratio;
}

export function roundTo15Seconds(ms: number): number {
  return Math.round(ms / FIFTEEN_SECONDS_MS) * FIFTEEN_SECONDS_MS;
}

export function accumulate(earnedThisPeriodMs: number, bankedMs: number, accumulationOn: boolean): number {
  return accumulationOn ? earnedThisPeriodMs + bankedMs : earnedThisPeriodMs;
}
