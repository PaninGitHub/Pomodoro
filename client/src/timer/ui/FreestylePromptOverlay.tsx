import { useTimer } from '../state/useTimer';
import { earnedBreakMs } from '../math/freestyleMath';
import { formatTime } from '../math/timerMath';

const btn = 'px-4 py-2 rounded border border-border bg-bg-secondary hover:bg-bg-tertiary text-text-primary';
const primary = 'px-4 py-2 rounded bg-accent text-bg-primary hover:opacity-90 font-semibold';
const danger = 'px-4 py-2 rounded border border-error text-error hover:bg-error hover:text-bg-primary';

/**
 * Inline prompt that replaces the Controls row when state.freestyle.prompt is
 * not 'none'. Two flavors:
 *  - 'target_reached': Continue / End Work / Reset
 *  - 'break_choice':   Start Break / Skip Break / End Session
 */
export function FreestylePromptOverlay(): JSX.Element | null {
  const { state, dispatch } = useTimer();
  if (state.mode !== 'freestyle' || !state.freestyle) return null;
  const prompt = state.freestyle.prompt;
  if (prompt === 'none') return null;

  if (prompt === 'target_reached') {
    return (
      <div className="flex flex-col items-center gap-3 p-4 border border-border rounded bg-bg-secondary/60">
        <p className="text-sm text-text-secondary">
          You've reached your work duration target. What next?
        </p>
        <div className="flex gap-2 flex-wrap justify-center">
          <button type="button" onClick={() => dispatch({ type: 'FREESTYLE_CONTINUE', now: Date.now() })} className={primary}>
            Continue working
          </button>
          <button type="button" onClick={() => dispatch({ type: 'FREESTYLE_END_WORK', now: Date.now() })} className={btn}>
            End work
          </button>
          <button type="button" onClick={() => dispatch({ type: 'FREESTYLE_RESET', now: Date.now() })} className={btn}>
            Reset
          </button>
        </div>
      </div>
    );
  }

  // break_choice
  const elapsedWork = state.accumulatedMs;
  const earnedThisPeriod = earnedBreakMs(elapsedWork, state.freestyleRatio);
  const carryBanked = state.freestyleAccumulation ? state.freestyle.bankedMs : 0;
  const breakTotal = Math.round(earnedThisPeriod + carryBanked);

  return (
    <div className="flex flex-col items-center gap-3 p-4 border border-border rounded bg-bg-secondary/60">
      <p className="text-sm text-text-secondary">
        Work period complete. You earned <span className="text-text-primary font-mono">{formatTime(breakTotal)}</span> of break.
      </p>
      <div className="flex gap-2 flex-wrap justify-center">
        <button type="button" onClick={() => dispatch({ type: 'FREESTYLE_START_BREAK', now: Date.now() })} className={primary}>
          Start break
        </button>
        <button type="button" onClick={() => dispatch({ type: 'FREESTYLE_SKIP_BREAK', now: Date.now() })} className={btn}>
          Skip break
        </button>
        <button type="button" onClick={() => dispatch({ type: 'END_SESSION' })} className={danger}>
          End session
        </button>
      </div>
    </div>
  );
}
