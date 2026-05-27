import { useState } from 'react';
import { useTasks } from './useTasks';
import { MAX_TASKS } from './TasksContext';

const MAX_NAME = 64;
const SHOW_COUNT_AT = Math.floor(MAX_NAME * 0.8); // ≥52

export function AddTaskForm(): JSX.Element {
  const { tasks, addTask } = useTasks();
  const [name, setName] = useState('');
  const [timeEstimate, setTimeEstimate] = useState('25');
  const [error, setError] = useState<string | null>(null);

  const remaining = MAX_NAME - name.length;
  const showCount = name.length >= SHOW_COUNT_AT;
  const atLimit = tasks.length >= MAX_TASKS;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) { setError('Task name is required.'); return; }
    if (trimmed.length > MAX_NAME) { setError(`Name must be ${MAX_NAME} characters or fewer.`); return; }
    const te = Number.parseInt(timeEstimate, 10);
    if (!Number.isFinite(te) || te < 1 || te > 1440) {
      setError('Time estimate must be between 1 and 1440 minutes.');
      return;
    }
    const r = await addTask(trimmed, te);
    if (!r.ok) { setError(r.error ?? 'Could not add task.'); return; }
    setName('');
    setTimeEstimate('25');
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-1">
      <div className="flex gap-2 items-center flex-wrap">
        <input
          type="text"
          placeholder={atLimit ? `Maximum ${MAX_TASKS} tasks reached` : 'Add task…'}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={MAX_NAME}
          disabled={atLimit}
          className="flex-1 min-w-[12rem] px-2 py-1 bg-bg-secondary border border-border rounded text-text-primary disabled:opacity-50"
        />
        <input
          type="number"
          min={1}
          max={1440}
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
