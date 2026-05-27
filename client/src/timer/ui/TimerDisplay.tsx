import { useState, useRef, useEffect } from 'react';
import { useTimer } from '../state/useTimer';
import { formatTime } from '../math/timerMath';
import { useSettings } from '../../settings/useSettings';

/**
 * Editable timer display.
 *
 * Per user feedback (Phase 2 revision):
 * - Click on the display when NOT running → inline edit.
 * - Persistence rule:
 *     - Truly idle (status='idle' AND no Pomodoro/Freestyle session started yet):
 *       update the persistent setting (work_duration for Pomodoro; per-session
 *       totalMs for Timer/Freestyle since neither has a "default" setting).
 *     - Otherwise (paused, completed-between-periods, etc.): per-session
 *       totalMs update only (does not persist).
 */
export function TimerDisplay(): JSX.Element {
  const { state, dispatch, remainingMs } = useTimer();
  const { settings, updateSettings } = useSettings();

  const editable = state.status !== 'running';
  const isTrulyIdle =
    state.status === 'idle' && state.pomodoro === null && state.freestyle === null;

  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState<string>('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { if (editing) inputRef.current?.select(); }, [editing]);

  function beginEdit() {
    if (!editable) return;
    // For Pomodoro idle, edit work_duration (in minutes). Otherwise edit totalMs.
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
    if (!Number.isFinite(n) || n <= 0 || n > 720) return; // silently bail on invalid
    if (state.mode === 'pomodoro' && isTrulyIdle) {
      // Truly idle Pomodoro → update the persistent setting.
      void updateSettings({ work_duration: Math.round(n) });
    } else {
      // Timer / Freestyle, OR Pomodoro mid-session → per-session totalMs.
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

  return (
    <div
      role={editable ? 'button' : undefined}
      tabIndex={editable ? 0 : -1}
      onClick={beginEdit}
      onKeyDown={(e) => { if (editable && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); beginEdit(); } }}
      className={[
        'text-timer text-7xl md:text-9xl font-mono tabular-nums select-none',
        editable ? 'cursor-text hover:opacity-80' : '',
      ].join(' ')}
      aria-live="polite"
      aria-atomic="true"
      title={editable ? 'Click to edit duration' : undefined}
    >
      {formatTime(remainingMs)}
    </div>
  );
}
