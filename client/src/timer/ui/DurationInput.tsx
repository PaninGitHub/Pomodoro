import { useState } from 'react';
import { useTimer } from '../state/useTimer';
import { validateDurationMinutesInput, MAX_PERIOD_MINUTES } from '../math/periodCap';

export function DurationInput(): JSX.Element | null {
  const { state, dispatch } = useTimer();
  const initialMinutes = Math.round(state.totalMs / 60000);
  const [raw, setRaw] = useState<string>(initialMinutes.toString());
  const [error, setError] = useState<string | null>(null);

  if (state.status !== 'idle') return null;

  function commit(next: string) {
    setRaw(next);
    const n = Number(next);
    const r = validateDurationMinutesInput(n);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setError(null);
    dispatch({ type: 'SET_DURATION', minutes: n });
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm text-text-secondary">
        Duration (minutes — decimals OK, rounds to nearest second)
        <input
          type="number"
          step="any"
          min={0.0167}
          max={MAX_PERIOD_MINUTES}
          value={raw}
          onChange={(e) => commit(e.target.value)}
          className="ml-2 px-2 py-1 bg-bg-secondary border border-border rounded text-text-primary w-24"
        />
      </label>
      {error && <span role="alert" className="text-error text-sm">{error}</span>}
    </div>
  );
}
