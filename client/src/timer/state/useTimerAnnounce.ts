import { useEffect, useRef, useState } from 'react';
import { useTimer } from './useTimer';

/**
 * Phase 6 Slice A item 2 — screen-reader announcer for timer transitions.
 *
 * Returns the latest announcement string. AppLayout renders it into a
 * hidden `role="status" aria-live="polite"` region so screen-reader users
 * hear period transitions even though the only sensory cue is an audible
 * alarm + visual modal.
 *
 * Announcements fire on these reducer-driven transitions only:
 *   - running → completed (PERIOD_COMPLETE for Pomodoro/Timer/Freestyle-break)
 *   - running → reflecting (WORK_PERIOD_DONE — reflection prompt opens)
 *
 * For Pomodoro PERIOD_COMPLETE the reducer has already advanced
 * `state.pomodoro.periodType` to the NEXT period when we observe the
 * 'completed' status, so the message describes what's *starting*.
 *
 * No de-dupe: identical consecutive announcements would not re-trigger a
 * screen reader, but the alternating work/break cycle means we never emit
 * the same string twice in a row in practice.
 */
export function useTimerAnnounce(): string {
  const { state } = useTimer();
  const [message, setMessage] = useState<string>('');
  const prevStatus = useRef(state.status);

  useEffect(() => {
    const prev = prevStatus.current;
    prevStatus.current = state.status;

    if (prev !== 'running') return;

    if (state.status === 'completed') {
      if (state.mode === 'pomodoro' && state.pomodoro) {
        const next = state.pomodoro.periodType;
        if (next === 'short_break') {
          setMessage('Work period complete. Short break starting.');
        } else if (next === 'long_break') {
          setMessage('Work period complete. Long break starting.');
        } else {
          setMessage('Break complete. Next work period starting.');
        }
        return;
      }
      if (state.mode === 'freestyle' && state.freestyle) {
        setMessage('Break complete. Next work period starting.');
        return;
      }
      setMessage('Timer complete.');
      return;
    }

    if (state.status === 'reflecting') {
      setMessage('Work period complete. Reflection prompt opened.');
    }
  }, [state.status, state.mode, state.pomodoro, state.freestyle]);

  return message;
}
