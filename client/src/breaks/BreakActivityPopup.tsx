// F-17 break activity selection popup.
//
// Renders an overlay during an ACTIVE break period (running/paused on a
// break) when no break_logs row has been opened yet. Three resolution
// paths:
//   1. Pick an activity   → POST /api/break-logs with activity_id+name,
//                            stash returned id, take the break
//   2. "None" (no choice) → POST with activity_id=null+name=null (per
//                            user's design clarification: still log that a
//                            break was taken), take the break
//   3. "Skip break"        → dispatch PERIOD_COMPLETE, NO log row, advance
//                            to the next period
//
// Gates:
//   - mode === 'timer' → never render (Batch B F-17 acceptance)
//   - not an active break period → never render
//   - currentBreakLogId already set → already handled, never render
//
// Guest + auth-pending fallback: when not authenticated or session id
// hasn't resolved yet, paths 1 + 2 stash a sentinel id so the popup
// closes without re-opening; no POST is made. The PATCH-on-end effect in
// TimerContext is auth-gated, so the sentinel never reaches the server.

import { useState } from 'react';
import { useTimer } from '../timer/state/useTimer';
import { useAuth } from '../auth/useAuth';
import { useBreakActivities } from './useBreakActivities';

// Marker for "popup resolved without a server row" — see file header.
const GUEST_HANDLED_SENTINEL = 'guest-handled';

export function BreakActivityPopup(): JSX.Element | null {
  const { state, dispatch } = useTimer();
  const { state: authState } = useAuth();
  const { activities } = useBreakActivities();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Gate: Timer mode never gets the popup.
  if (state.mode === 'timer') return null;

  // Gate: only show during an active break period.
  const inActiveBreak =
    (state.status === 'running' || state.status === 'paused') &&
    (
      (state.mode === 'pomodoro' && (
        state.pomodoro?.periodType === 'short_break' ||
        state.pomodoro?.periodType === 'long_break'
      )) ||
      (state.mode === 'freestyle' && state.freestyle?.periodType === 'break')
    );
  if (!inActiveBreak) return null;

  // Gate: already chosen (real id from POST or sentinel from guest path).
  if (state.currentBreakLogId !== null) return null;

  const isAuth = authState.kind === 'signed_in';
  const breakDurationMs = state.totalMs;
  const breakDurationMin = Math.max(1, Math.round(breakDurationMs / 60000));

  async function postLog(activity_id: string | null, activity_name: string | null): Promise<void> {
    // Guest or pre-session-id auth path: no server row, just close popup.
    if (!isAuth || state.currentSessionId === null) {
      dispatch({ type: 'SET_BREAK_LOG_ID', logId: GUEST_HANDLED_SENTINEL });
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/break-logs', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: state.currentSessionId,
          activity_id,
          activity_name,
          break_started_at: new Date().toISOString(),
        }),
      });
      if (res.status !== 201) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? 'Could not log break.');
        setSubmitting(false);
        return;
      }
      const body = (await res.json()) as { break_log: { id: string } };
      dispatch({ type: 'SET_BREAK_LOG_ID', logId: body.break_log.id });
      // No setSubmitting(false): the popup unmounts as soon as
      // currentBreakLogId becomes non-null.
    } catch {
      setError('Server unreachable.');
      setSubmitting(false);
    }
  }

  function onSkipBreak(): void {
    // Skip break entirely per user's design clarification: no log row,
    // advance to next period. PERIOD_COMPLETE handles both Pomodoro
    // (break → work) and Freestyle (break → work) transitions.
    dispatch({ type: 'PERIOD_COMPLETE', now: Date.now() });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pick a break activity"
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg-primary/75 p-4"
    >
      <div className="bg-bg-secondary border border-border rounded-lg p-6 max-w-md w-full flex flex-col gap-4">
        <div className="flex items-baseline justify-between">
          <h3 className="text-lg text-text-primary">Pick a break activity</h3>
          <span className="text-xs text-text-secondary">{breakDurationMin} min break</span>
        </div>

        {activities.length === 0 ? (
          <p className="text-sm text-text-secondary italic">
            No activities saved yet. You can add some on the <strong>Breaks</strong> page,
            or take the break without picking one.
          </p>
        ) : (
          <ul className="flex flex-col gap-2 list-none p-0 m-0 max-h-64 overflow-y-auto">
            {activities.map((a) => {
              const overflow = a.time_estimate * 60 * 1000 > breakDurationMs;
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => { void postLog(a.id, a.name); }}
                    className={`w-full text-left px-3 py-2 border rounded bg-bg-tertiary hover:bg-border disabled:opacity-50 disabled:cursor-not-allowed flex justify-between items-center gap-2 ${
                      overflow ? 'border-warning text-warning' : 'border-border text-text-primary'
                    }`}
                    title={overflow ? `Longer than your ${breakDurationMin}-min break` : undefined}
                  >
                    <span>{a.name}</span>
                    <span className="text-xs text-text-secondary whitespace-nowrap">
                      {a.time_estimate} min{overflow ? ' ⚠' : ''}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {error && <span role="alert" className="text-error text-sm">{error}</span>}

        <div className="flex flex-col gap-2 pt-2 border-t border-border">
          <button
            type="button"
            disabled={submitting}
            onClick={() => { void postLog(null, null); }}
            className="px-3 py-2 border border-border rounded bg-bg-tertiary text-text-secondary hover:text-text-primary hover:bg-border disabled:opacity-50"
          >
            None — just take the break
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={onSkipBreak}
            className="px-3 py-2 border border-border rounded text-text-secondary hover:text-text-primary disabled:opacity-50"
          >
            Skip break entirely
          </button>
        </div>
      </div>
    </div>
  );
}
