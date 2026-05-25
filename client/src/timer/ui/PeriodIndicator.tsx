import { useTimer } from '../state/useTimer';

export function PeriodIndicator(): JSX.Element {
  const { state } = useTimer();
  let label = '';
  if (state.mode === 'timer') {
    label = 'Timer';
  } else if (state.mode === 'freestyle') {
    label = 'Freestyle · Work';
  } else {
    // pomodoro
    if (!state.pomodoro) {
      label = 'Pomodoro';
    } else {
      // workCount is COMPLETED periods so far; "Work N" displays the period the
      // user is in (or about to start). During work period 1, workCount=0 → "Work 1".
      // After completing work period 1, the next "Work" period (when prepared/started
      // again after a break) shows workCount=1 → "Work 2".
      const typeLabel =
        state.pomodoro.periodType === 'work'
          ? `Work ${state.pomodoro.workCount + 1}`
          : state.pomodoro.periodType === 'short_break'
          ? 'Short Break'
          : 'Long Break';
      label = `Pomodoro · ${typeLabel}`;
    }
  }
  return (
    <div className="text-text-secondary uppercase tracking-widest text-sm">
      {label}
    </div>
  );
}
