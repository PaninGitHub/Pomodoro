import { useState, useRef, useEffect } from 'react';
import { useTimer } from '../state/useTimer';
import { useSettings } from '../../settings/useSettings';

/**
 * Editable timer display.
 *
 * Display semantics:
 *  - Timer / Pomodoro: count DOWN (remaining time).
 *  - Freestyle WORK: count UP (elapsed time) — stopwatch behavior per C-09.
 *  - Freestyle BREAK: count DOWN (remaining break time).
 *
 * Click-to-edit (Phase 2 mid-fix):
 *  - Click any segment (hours / minutes / seconds) to edit JUST that
 *    segment, not the whole display. The other segments stay rendered.
 *  - Allowed when status is idle, paused, or completed. Disabled while
 *    running and for any Freestyle period (Freestyle target lives in
 *    Settings → Per-mode popup; stopwatch elapsed isn't user-editable).
 *  - Truly-idle Pomodoro persists into settings.work_duration (whole
 *    minutes only). Otherwise dispatches SET_DURATION as the new
 *    "time left from now" (reducer resets accumulatedMs).
 */
export function TimerDisplay(): JSX.Element {
  const { state, dispatch, remainingMs } = useTimer();
  const { updateSettings } = useSettings();

  const isFreestyle = state.mode === 'freestyle';
  const isFreestyleWork = isFreestyle && state.freestyle?.periodType === 'work';

  // Freestyle work counts UP from accumulatedMs + (now - startTimestamp).
  const elapsedMs = isFreestyleWork
    ? (state.status === 'running'
        ? state.accumulatedMs + (Date.now() - state.startTimestamp)
        : state.accumulatedMs)
    : 0;

  const displayMs = isFreestyleWork ? elapsedMs : remainingMs;

  // Editable: idle/paused/completed in non-Freestyle modes only.
  const editable = state.status !== 'running' && !isFreestyle;
  const isTrulyIdle =
    state.status === 'idle' && state.pomodoro === null && state.freestyle === null;

  // Decompose displayMs into hh:mm:ss; show hours only when present.
  // Per B2: count-up uses floor (Freestyle work); everything else uses ceil.
  const totalSeconds = isFreestyleWork
    ? Math.floor(Math.max(0, displayMs) / 1000)
    : Math.ceil(Math.max(0, displayMs) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const showHours = hours > 0;

  const [editing, setEditing] = useState<'h' | 'm' | 's' | null>(null);
  const [raw, setRaw] = useState<string>('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { if (editing) inputRef.current?.select(); }, [editing]);

  function beginEdit(seg: 'h' | 'm' | 's') {
    if (!editable) return;
    const current = seg === 'h' ? hours : seg === 'm' ? minutes : seconds;
    setRaw(String(current));
    setEditing(seg);
  }

  function commit() {
    const seg = editing;
    setEditing(null);
    if (!seg) return;
    // Empty input or non-numeric: zero for that segment (per user request:
    // numeric inputs are clearable; the timer left CAN be zero).
    const parsed = raw === '' ? 0 : Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed < 0) return;
    const newH = seg === 'h' ? parsed : hours;
    const newM = seg === 'm' ? parsed : minutes;
    const newS = seg === 's' ? parsed : seconds;
    const totalSec = newH * 3600 + newM * 60 + newS;
    // 720-minute (12-hour) period cap.
    const cappedSec = Math.min(totalSec, 720 * 60);

    if (state.mode === 'pomodoro' && isTrulyIdle) {
      // Truly idle Pomodoro persists into settings (whole minutes; min 1
      // because work_duration has CHECK BETWEEN 1 AND 720).
      const wholeMin = Math.max(1, Math.round(cappedSec / 60));
      void updateSettings({ work_duration: wholeMin });
      return;
    }
    dispatch({ type: 'SET_DURATION', minutes: cappedSec / 60 });
  }

  function cancel() { setEditing(null); setRaw(''); }

  const pad = (n: number) => n.toString().padStart(2, '0');
  // Segment input class: matches digit font-size; narrow per-segment width.
  const segInputCls =
    'text-timer text-7xl md:text-9xl font-mono tabular-nums bg-bg-secondary border border-border rounded px-1 text-center w-[2.5ch] focus:outline-none focus:border-accent';
  const segBtnCls = (active: boolean) =>
    [
      'text-timer text-7xl md:text-9xl font-mono tabular-nums select-none px-0.5',
      editable ? 'cursor-text hover:bg-bg-secondary/40 rounded' : '',
      active ? 'bg-bg-secondary/60 rounded' : '',
    ].filter(Boolean).join(' ');
  const sepCls = 'text-timer text-7xl md:text-9xl font-mono tabular-nums select-none';

  function renderSegment(seg: 'h' | 'm' | 's', value: number) {
    if (editing === seg) {
      return (
        <input
          ref={inputRef}
          type="number"
          min={0}
          max={seg === 'h' ? 12 : 59}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') cancel();
          }}
          aria-label={`Edit ${seg === 'h' ? 'hours' : seg === 'm' ? 'minutes' : 'seconds'}`}
          className={segInputCls}
        />
      );
    }
    return (
      <span
        role={editable ? 'button' : undefined}
        tabIndex={editable ? 0 : -1}
        onClick={() => beginEdit(seg)}
        onKeyDown={(e) => {
          if (editable && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            beginEdit(seg);
          }
        }}
        className={segBtnCls(false)}
        title={editable ? `Click to edit ${seg === 'h' ? 'hours' : seg === 'm' ? 'minutes' : 'seconds'}` : undefined}
      >
        {pad(value)}
      </span>
    );
  }

  return (
    <div
      className="flex items-baseline"
      aria-live="polite"
      aria-atomic="true"
      aria-label={
        showHours
          ? `${pad(hours)} hours ${pad(minutes)} minutes ${pad(seconds)} seconds`
          : `${pad(minutes)} minutes ${pad(seconds)} seconds`
      }
    >
      {showHours && (
        <>
          {renderSegment('h', hours)}
          <span className={sepCls}>:</span>
        </>
      )}
      {renderSegment('m', minutes)}
      <span className={sepCls}>:</span>
      {renderSegment('s', seconds)}
    </div>
  );
}
