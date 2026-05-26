import { useState } from 'react';
import { useTimer } from '../state/useTimer';
import { validateDurationMinutesInput } from '../math/periodCap';

// TODO(phase-2): hoist ratio + accumulationOn into settings DB/cookie.
const DEFAULT_RATIO = 5;
const DEFAULT_ACCUMULATION = true;

export function FreestyleSetup(): JSX.Element | null {
  const { state, dispatch } = useTimer();
  const [durationRaw, setDurationRaw] = useState<string>(Math.round(state.totalMs / 60000).toString());
  const [durationError, setDurationError] = useState<string | null>(null);
  // TODO(phase-2): replace local state with Settings context.
  const [ratio, setRatio] = useState<number>(DEFAULT_RATIO);
  const [accumulation, setAccumulation] = useState<boolean>(DEFAULT_ACCUMULATION);

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
    // Enforce max 2 decimal places per C-04
    const rounded = Math.round(n * 100) / 100;
    setRatio(rounded);
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
          value={ratio}
          onChange={(e) => onRatioChange(e.target.value)}
          className="ml-2 px-2 py-1 bg-bg-secondary border border-border rounded text-text-primary w-24"
        />
      </label>

      <label className="text-sm text-text-secondary flex items-center gap-2">
        <input
          type="checkbox"
          checked={accumulation}
          onChange={(e) => setAccumulation(e.target.checked)}
        />
        Accumulate unspent break time across periods
      </label>
    </div>
  );
}
