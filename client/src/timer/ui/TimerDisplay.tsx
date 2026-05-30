import { useState, useRef, useEffect } from 'react';
import { useTimer } from '../state/useTimer';
import { formatTime } from '../math/timerMath';
import { useSettings } from '../../settings/useSettings';

/**
 * Editable timer display.
 *
 * Display semantics:
 *  - Timer / Pomodoro: count DOWN (remaining time).
 *  - Freestyle WORK: count UP (elapsed time) — stopwatch behavior per C-09.
 *  - Freestyle BREAK: count DOWN (remaining break time).
 *
 * Click-to-edit (when not running):
 *  - Truly idle (no session started): updates work_duration setting for
 *    Pomodoro; per-session totalMs for Timer/Freestyle.
 *  - Otherwise (paused or completed): per-session totalMs only.
 */
export function TimerDisplay(): JSX.Element {
  const { state, dispatch, remainingMs } = useTimer();
  const { settings, updateSettings } = useSettings();

  const isFreestyleWork =
    state.mode === 'freestyle' &&
    state.freestyle?.periodType === 'work';

  // For Freestyle work, compute the "elapsed" value (count up).
  const elapsedMs =
    isFreestyleWork
      ? (state.status === 'running'
          ? state.accumulatedMs + (Date.now() - state.startTimestamp)
          : state.accumulatedMs)
      : 0;

  // We need to refresh on tick when in Freestyle work (since elapsedMs uses Date.now()).
  // useState forces re-render via the parent TimerContext tick. The remainingMs
  // path already triggers re-renders on tick. To stay simple, derive a display
  // value: countdown for non-Freestyle-work, count-up otherwise.
  const displayMs = isFreestyleWork ? elapsedMs : remainingMs;

  const editable = state.status !== 'running';
  const isTrulyIdle =
    state.status === 'idle' && state.pomodoro === null && state.freestyle === null;

  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState<string>('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { if (editing) inputRef.current?.select(); }, [editing]);

  function beginEdit() {
    if (!editable) return;
    if (isFreestyleWork) return; // can't edit elapsed-time during freestyle work
    const currentMin =
      state.mode === 'pomodoro' && isTrulyIdle
        ? settings.work_duration
        : state.totalMs / 60000;
    setRaw(String(currentMin));
    setEditing(true);
  }

  function commit() {
    setEditing(false);
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0 || n > 720) return;
    if (state.mode === 'pomodoro' && isTrulyIdle) {
      void updateSettings({ work_duration: Math.round(n) });
    } else {
      dispatch({ type: 'SET_DURATION', minutes: n });
    }
  }

  function cancel() {
    setEditing(false);
    setRaw('');
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        step="any"
        min={0.0167}
        max={720}
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') cancel();
        }}
        aria-label="Edit timer duration in minutes"
        className="text-timer text-7xl md:text-9xl font-mono tabular-nums bg-bg-secondary border border-border rounded px-4 py-1 w-[14ch] text-center"
      />
    );
  }

  // Title hint: depends on mode + state
  const title = !editable
    ? undefined
    : isFreestyleWork
    ? undefined
    : 'Click to edit duration';

  return (
    <div
      role={editable && !isFreestyleWork ? 'button' : undefined}
      tabIndex={editable && !isFreestyleWork ? 0 : -1}
      onClick={beginEdit}
      onKeyDown={(e) => {
        if (editable && !isFreestyleWork && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          beginEdit();
        }
      }}
      className={[
        'text-timer text-7xl md:text-9xl font-mono tabular-nums select-none',
        editable && !isFreestyleWork ? 'cursor-text hover:opacity-80' : '',
      ].join(' ')}
      aria-live="polite"
      aria-atomic="true"
      title={title}
    >
      {formatTime(displayMs)}
    </div>
  );
}
