import { useTimer } from '../state/useTimer';
import type { TimerMode } from '../state/timerReducer';

const MODES: { value: TimerMode; label: string }[] = [
  { value: 'timer',     label: 'Timer' },
  { value: 'pomodoro',  label: 'Pomodoro' },
  { value: 'freestyle', label: 'Freestyle' },
];

/**
 * Pill-style mode selector with a single sliding indicator that animates
 * smoothly along the X-axis between selections (transform: translateX).
 * Placed above the timer display, styled to match the period indicator's
 * uppercase / tracking-widest typography.
 */
export function ModeTabs(): JSX.Element {
  const { state, dispatch } = useTimer();
  const selectedIndex = MODES.findIndex((m) => m.value === state.mode);
  const disabled = state.status !== 'idle';

  return (
    <div
      role="radiogroup"
      aria-label="Timer mode"
      className={`relative inline-flex items-stretch border border-border rounded-md overflow-hidden bg-bg-secondary ${disabled ? 'opacity-60' : ''}`}
    >
      {/* Sliding indicator (the white pill) */}
      <div
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-1/3 bg-accent transition-transform duration-200 ease-out"
        style={{ transform: `translateX(${selectedIndex * 100}%)` }}
      />
      {MODES.map((m) => {
        const active = m.value === state.mode;
        return (
          <button
            key={m.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => dispatch({ type: 'SELECT_MODE', mode: m.value })}
            className={[
              'relative z-10 px-4 py-1 text-xs uppercase tracking-widest min-w-[6rem] text-center transition-colors duration-200',
              active ? 'text-bg-primary' : 'text-text-secondary hover:text-text-primary',
              disabled && 'cursor-not-allowed',
            ].filter(Boolean).join(' ')}
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
