import { useState } from 'react';
import { useTimer } from '../state/useTimer';
import { validateDurationMinutesInput } from '../math/periodCap';

export function FreestyleSetup(): JSX.Element | null {
  const { state, dispatch } = useTimer();
  const [durationRaw, setDurationRaw] = useState<string>((state.totalMs / 60000).toString());
  const [durationError, setDurationError] = useState<string | null>(null);
  // Local string state for ratio so the user can clear / partially type without
  // the field snapping back to the last valid value mid-edit.
  const [ratioRaw, setRatioRaw] = useState<string>(state.freestyleRatio.toString());

  if (state.status !== 'idle') return null;

  function onDurationChange(next: string) {
    setDurationRaw(next);
    const r = validateDurationMinutesInput(Number(next));
    if (!r.ok) { setDurationError(r.error); return; }
    setDurationError(null);
    dispatch({ type: 'SET_DURATION', minutes: Number(next) });
  }

  function onRatioChange(next: string) {
    // Always update the visible field so the user can backspace, type partial
    // values, etc. Only dispatch to the reducer when the value parses cleanly.
    setRatioRaw(next);
    const n = Number(next);
    if (!Number.isFinite(n) || n <= 0) return;
    dispatch({ type: 'SET_FREESTYLE_RATIO', value: n });
  }

  function onRatioBlur() {
    // On blur, if the field is empty or invalid, reset to the last committed
    // value so the input never gets stuck in a confusing empty state.
    const n = Number(ratioRaw);
    if (!Number.isFinite(n) || n <= 0) {
      setRatioRaw(state.freestyleRatio.toString());
    }
  }

  function onAccumulationChange(checked: boolean) {
    dispatch({ type: 'SET_FREESTYLE_ACCUMULATION', value: checked });
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm text-text-secondary">
        Work duration (minutes — decimals OK, rounds to nearest second)
        <input
          type="number" step="any" min={0.0167} max={720}
          value={durationRaw}
          onChange={(e) => onDurationChange(e.target.value)}
          className="ml-2 px-2 py-1 bg-bg-secondary border border-border rounded text-text-primary w-24"
        />
      </label>
      {durationError && <span role="alert" className="text-error text-sm">{durationError}</span>}

      <label className="text-sm text-text-secondary">
        Ratio (X:1) — every X min of work earns 1 min of break
        <input
          type="number" min={0.01} step="any"
          value={ratioRaw}
          onChange={(e) => onRatioChange(e.target.value)}
          onBlur={onRatioBlur}
          className="ml-2 px-2 py-1 bg-bg-secondary border border-border rounded text-text-primary w-24"
        />
      </label>

      <label className="text-sm text-text-secondary flex items-center gap-2">
        <input
          type="checkbox"
          checked={state.freestyleAccumulation}
          onChange={(e) => onAccumulationChange(e.target.checked)}
        />
        Accumulate unspent break time across periods
      </label>
    </div>
  );
}
