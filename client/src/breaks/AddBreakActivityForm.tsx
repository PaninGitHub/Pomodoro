// Form for creating a new break activity. Mirrors tasks/AddTaskForm.tsx
// with one change: the limit is dynamic (settings.break_activity_limit)
// rather than hardcoded.

import { useState } from 'react';
import { useBreakActivities } from './useBreakActivities';
import { useSettings } from '../settings/useSettings';
import { ACTIVITY_NAME_MAX, ACTIVITY_TIME_ESTIMATE_MIN, ACTIVITY_TIME_ESTIMATE_MAX } from './breakTypes';

const SHOW_COUNT_AT = Math.floor(ACTIVITY_NAME_MAX * 0.8);

export function AddBreakActivityForm(): JSX.Element {
  const { activities, addActivity } = useBreakActivities();
  const { settings } = useSettings();
  const [name, setName] = useState('');
  const [timeEstimate, setTimeEstimate] = useState('5');
  const [error, setError] = useState<string | null>(null);

  const limit = settings.break_activity_limit;
  const atLimit = activities.length >= limit;
  const remaining = ACTIVITY_NAME_MAX - name.length;
  const showCount = name.length >= SHOW_COUNT_AT;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) { setError('Activity name is required.'); return; }
    if (trimmed.length > ACTIVITY_NAME_MAX) {
      setError(`Name must be ${ACTIVITY_NAME_MAX} characters or fewer.`);
      return;
    }
    const te = Number.parseInt(timeEstimate, 10);
    if (!Number.isFinite(te) || te < ACTIVITY_TIME_ESTIMATE_MIN || te > ACTIVITY_TIME_ESTIMATE_MAX) {
      setError(`Time estimate must be between ${ACTIVITY_TIME_ESTIMATE_MIN} and ${ACTIVITY_TIME_ESTIMATE_MAX} minutes.`);
      return;
    }
    const r = await addActivity(trimmed, te);
    if (!r.ok) { setError(r.error ?? 'Could not add activity.'); return; }
    setName('');
    setTimeEstimate('5');
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-1">
      <div className="flex gap-2 items-center flex-wrap">
        <input
          type="text"
          placeholder={atLimit ? `Maximum ${limit} activities reached` : 'Add break activity…'}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={ACTIVITY_NAME_MAX}
          disabled={atLimit}
          className="flex-1 min-w-[12rem] px-2 py-1 bg-bg-secondary border border-border rounded text-text-primary disabled:opacity-50"
        />
        <input
          type="number"
          min={ACTIVITY_TIME_ESTIMATE_MIN}
          max={ACTIVITY_TIME_ESTIMATE_MAX}
          value={timeEstimate}
          onChange={(e) => setTimeEstimate(e.target.value)}
          disabled={atLimit}
          className="w-20 px-2 py-1 bg-bg-secondary border border-border rounded text-text-primary disabled:opacity-50"
          aria-label="Time estimate (minutes)"
        />
        <span className="text-xs text-text-secondary">min</span>
        <button
          type="submit"
          disabled={atLimit || !name.trim()}
          className="px-4 py-1 rounded bg-accent text-bg-primary font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add
        </button>
      </div>
      {showCount && !atLimit && (
        <span className="text-xs text-text-secondary">{remaining} characters left</span>
      )}
      {error && <span role="alert" className="text-error text-sm">{error}</span>}
    </form>
  );
}
