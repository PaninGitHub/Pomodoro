// Phase 6 Slice B — public beta banner.
//
// Renders only when import.meta.env.VITE_BETA_BANNER is truthy (set in
// the prod beta build's .env / docker build arg). Local dev + the
// prod-final build leave the flag unset so the banner stays invisible.
//
// Warning copy reflects PROGRESS.md known limitation #1: refreshing
// mid-session resets the in-memory timer reducer state and leaves the
// break_logs row open (NULL break_ended_at). Sweep job to clean those
// stale rows is a Phase 7+ task.
//
// Uses --color-warning bg + --color-bg-primary text to mirror the
// TwoTabBanner precedent. role="status" not role="alert" — it's a
// persistent advisory, not an interrupt.

export function BetaBanner(): JSX.Element | null {
  if (!import.meta.env.VITE_BETA_BANNER) return null;
  return (
    <div
      role="status"
      className="w-full bg-warning text-bg-primary px-4 py-2 text-sm text-center"
    >
      <strong>Public beta.</strong>{' '}
      Don&apos;t refresh mid-session — the timer state will reset.
    </div>
  );
}
