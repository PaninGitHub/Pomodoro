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

export function formatTime(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  if (hours > 0) return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  return `${pad(minutes)}:${pad(seconds)}`;
}
