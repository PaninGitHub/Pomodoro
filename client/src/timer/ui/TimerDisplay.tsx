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
  const { settings, updateSettings } = useSettings();

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
  // F1: settings.show_hours=false rolls hours into the minutes segment.
  // Result: "120:00" instead of "02:00:00". 3-digit minutes display
  // naturally via padStart(2) (which is a no-op for length > 2).
  const showHoursSegment = settings.show_hours && hours > 0;
  const displayMinutes = settings.show_hours ? minutes : (hours * 60 + minutes);

  const [editing, setEditing] = useState<'h' | 'm' | 's' | null>(null);
  const [raw, setRaw] = useState<string>('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { if (editing) inputRef.current?.select(); }, [editing]);

  function beginEdit(seg: 'h' | 'm' | 's') {
    if (!editable) return;
    // In show_hours=false mode, the minute segment shows hours rolled up
    // (displayMinutes). Use that as the edit baseline so an edit of "120"
    // commits as 120 minutes, not as 120 added to a hidden hours value.
    const current = seg === 'h' ? hours : seg === 'm' ? displayMinutes : seconds;
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
    // In show_hours=false mode, the minute segment carries the full minute
    // count. Treat hours as 0 in the time math when computing the new total
    // — otherwise editing "150" with hours=2 still in scope would add 2h
    // back in on top.
    const minuteBaseline = settings.show_hours ? minutes : displayMinutes;
    const newM = seg === 'm' ? parsed : minuteBaseline;
    const newS = seg === 's' ? parsed : seconds;
    const hoursContribution = settings.show_hours ? newH * 3600 : 0;
    const totalSec = hoursContribution + newM * 60 + newS;
    // 720-minute (12-hour) period cap.
    const cappedSec = Math.min(totalSec, 720 * 60);

    if (state.mode === 'pomodoro' && isTrulyIdle) {
      // Settings.work_duration is INTEGER minutes. If the user edited
      // a non-zero seconds portion (e.g. 26:24), persisting that would
      // silently drop the seconds. Drop through to SET_DURATION so the
      // per-session totalMs accepts seconds; settings only persists if
      // the value is whole minutes (C-15 resolution).
      if (cappedSec % 60 === 0) {
        const wholeMin = Math.max(1, cappedSec / 60);
        void updateSettings({ work_duration: wholeMin });
        return;
      }
      // else fall through to SET_DURATION below
    }
    dispatch({ type: 'SET_DURATION', minutes: cappedSec / 60 });
  }

  function cancel() { setEditing(null); setRaw(''); }

  const pad = (n: number) => n.toString().padStart(2, '0');
  // Segment input class: matches digit font-size; narrow per-segment width.
  const segInputClsBase =
    'text-timer text-7xl md:text-9xl font-mono tabular-nums bg-bg-secondary border border-border rounded px-1 text-center focus:outline-none focus:border-accent';
  // F1: minutes input widens to 3.5ch when in MMM:SS mode so 3-digit
  // values (e.g. 120) aren't visually clipped during edit.
  const segInputCls = (seg: 'h' | 'm' | 's') =>
    `${segInputClsBase} ${seg === 'm' && !settings.show_hours ? 'w-[3.5ch]' : 'w-[2.5ch]'}`;
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
          max={
            seg === 'h' ? 12
              : seg === 'm' ? (settings.show_hours ? 59 : 720)
              : 59
          }
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') cancel();
          }}
          aria-label={`Edit ${seg === 'h' ? 'hours' : seg === 'm' ? 'minutes' : 'seconds'}`}
          className={segInputCls(seg)}
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
        showHoursSegment
          ? `${pad(hours)} hours ${pad(minutes)} minutes ${pad(seconds)} seconds`
          : `${pad(displayMinutes)} minutes ${pad(seconds)} seconds`
      }
    >
      {showHoursSegment && (
        <>
          {renderSegment('h', hours)}
          <span className={sepCls}>:</span>
        </>
      )}
      {renderSegment('m', displayMinutes)}
      <span className={sepCls}>:</span>
      {renderSegment('s', seconds)}
    </div>
  );
}
