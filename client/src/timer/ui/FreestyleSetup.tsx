import { useState } from 'react';
import { useTimer } from '../state/useTimer';
import { validateDurationMinutesInput } from '../math/periodCap';

export function FreestyleSetup(): JSX.Element | null {
  const { state, dispatch } = useTimer();
  const [durationRaw, setDurationRaw] = useState<string>((state.totalMs / 60000).toString());
  const [durationError, setDurationError] = useState<string | null>(null);

  if (state.status !== 'idle') return null;

  function onDurationChange(next: string) {
    setDurationRaw(next);
    const r = validateDurationMinutesInput(Number(next));
    if (!r.ok) { setDurationError(r.error); return; }
    setDurationError(null);
    dispatch({ type: 'SET_DURATION', minutes: Number(next) });
  }

  function onRatioChange(next: string) {
    const n = Number(next);
    if (!Number.isFinite(n) || n <= 0) return;
    dispatch({ type: 'SET_FREESTYLE_RATIO', value: n });
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
          type="number" min={0.01} step={0.01}
          value={state.freestyleRatio}
          onChange={(e) => onRatioChange(e.target.value)}
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
