import { useTimer } from '../state/useTimer';
import type { TimerMode } from '../state/timerReducer';

const MODES: { value: TimerMode; label: string }[] = [
  { value: 'timer',     label: 'Timer' },
  { value: 'pomodoro',  label: 'Pomodoro' },
  { value: 'freestyle', label: 'Freestyle' },
];

export function ModeSelector(): JSX.Element {
  const { state, dispatch } = useTimer();
  const disabled = state.status !== 'idle';

  return (
    <div className="flex gap-2" role="radiogroup" aria-label="Timer mode">
      {MODES.map((m) => (
        <button
          key={m.value}
          type="button"
          role="radio"
          aria-checked={state.mode === m.value}
          disabled={disabled}
          onClick={() => dispatch({ type: 'SELECT_MODE', mode: m.value })}
          className={[
            'px-4 py-2 rounded border border-border transition-colors',
            state.mode === m.value
              ? 'bg-accent text-bg-primary'
              : 'bg-bg-secondary text-text-primary hover:bg-bg-tertiary',
            disabled && 'opacity-50 cursor-not-allowed',
          ].filter(Boolean).join(' ')}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
