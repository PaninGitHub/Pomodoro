import { useTimer } from '../state/useTimer';
import type { TimerMode } from '../state/timerReducer';

const MODES: { value: TimerMode; label: string }[] = [
  { value: 'timer',     label: 'Timer' },
  { value: 'pomodoro',  label: 'Pomodoro' },
  { value: 'freestyle', label: 'Freestyle' },
];

/**
 * Mode selector — equal-width 3-column grid with a sliding pill indicator.
 * Phase 2 mid-fix: switched from inline-flex (variable column widths
 * caused the indicator to drift away from longer labels like "Freestyle")
 * to grid-cols-3 so every cell is exactly 1/3 of the parent — making the
 * 1/3-wide indicator's translateX(N * 100%) land perfectly on each cell.
 */
export function ModeTabs(): JSX.Element {
  const { state, dispatch } = useTimer();
  const selectedIndex = MODES.findIndex((m) => m.value === state.mode);
  const disabled = state.status !== 'idle';

  return (
    <div
      role="radiogroup"
      aria-label="Timer mode"
      className={`relative grid grid-cols-3 mx-auto w-full max-w-sm border border-border rounded-full overflow-hidden bg-bg-secondary p-0.5 ${disabled ? 'opacity-60' : ''}`}
    >
      {/* Sliding indicator (pill) — sits inside the 0.5 padding so the
          highlighted cell doesn't bleed to the outer border. */}
      <div
        aria-hidden="true"
        className="absolute top-0.5 bottom-0.5 left-0.5 w-[calc((100%-0.25rem)/3)] rounded-full bg-accent transition-transform duration-200 ease-out pointer-events-none"
        style={{ transform: `translateX(calc(${selectedIndex} * 100%))` }}
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
              'relative z-10 px-4 py-2 text-xs uppercase tracking-widest text-center transition-colors duration-200 rounded-full',
              active ? 'text-bg-primary font-semibold' : 'text-text-secondary hover:text-text-primary',
              disabled ? 'cursor-not-allowed' : 'cursor-pointer',
            ].filter(Boolean).join(' ')}
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
