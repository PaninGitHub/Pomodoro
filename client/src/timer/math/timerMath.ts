// Pure timer math. No side effects, no Date.now() calls — `now` is always passed in.

export interface RunningTimer {
  totalMs: number;
  startTimestamp: number;
  accumulatedMs: number; // elapsed from prior unpaused intervals
}

export function computeElapsed(t: { startTimestamp: number; accumulatedMs: number }, now: number): number {
  return t.accumulatedMs + (now - t.startTimestamp);
}

export function computeRemaining(t: RunningTimer, now: number): number {
  const remaining = t.totalMs - computeElapsed(t, now);
  return Math.max(0, remaining);
}

function decompose(seconds: number) {
  const hours   = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs    = seconds % 60;
  return { hours, minutes, secs };
}

function render(hours: number, minutes: number, secs: number): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  if (hours > 0) return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
  return `${pad(minutes)}:${pad(secs)}`;
}

/**
 * Countdown display — rounds UP so a half-second of remaining time
 * still shows as "00:01" rather than "00:00".
 */
export function formatRemaining(ms: number): string {
  const seconds = Math.ceil(Math.max(0, ms) / 1000);
  const { hours, minutes, secs } = decompose(seconds);
  return render(hours, minutes, secs);
}

/**
 * Count-up display — rounds DOWN so the first sub-second after Start
 * still reads "00:00" instead of jumping straight to "00:01" (B2 fix).
 */
export function formatElapsed(ms: number): string {
  const seconds = Math.floor(Math.max(0, ms) / 1000);
  const { hours, minutes, secs } = decompose(seconds);
  return render(hours, minutes, secs);
}

// Legacy alias retained for any unmodified callers (now delegates).
export function formatTime(ms: number): string {
  return formatRemaining(ms);
}
