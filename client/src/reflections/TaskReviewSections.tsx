import { useTasks } from '../tasks/useTasks';
import type { PeriodTaskSnapshot } from '../timer/state/timerReducer';

interface Props {
  snapshot: PeriodTaskSnapshot[];
}

// Renders two sections (Completed / Incomplete) of the current tasks list,
// with an "added during period" indicator on tasks whose id isn't in the
// passed-in snapshot. Tasks remain checkable inline (F-15) — the modal
// re-renders against the live useTasks() list so re-categorizing happens
// on next render.
export function TaskReviewSections({ snapshot }: Props): JSX.Element {
  const { tasks, toggleComplete } = useTasks();
  const snapshotIds = new Set(snapshot.map((s) => s.id));

  const completed = tasks.filter((t) => t.is_complete);
  const incomplete = tasks.filter((t) => !t.is_complete);

  function row(t: { id: string; name: string; is_complete: boolean }) {
    const isAdded = !snapshotIds.has(t.id);
    return (
      <li
        key={t.id}
        className={`flex items-center gap-2 px-2 py-1 rounded ${
          isAdded ? 'border-l-2 border-warning pl-2' : ''
        }`}
      >
        <input
          type="checkbox"
          checked={t.is_complete}
          onChange={() => void toggleComplete(t.id)}
          aria-label={`Toggle ${t.name} complete`}
        />
        <span className={t.is_complete ? 'line-through text-text-secondary' : 'text-text-primary'}>
          {t.name}
        </span>
        {isAdded && <span className="text-xs text-text-secondary">· added</span>}
      </li>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <section>
        <h4 className="text-xs uppercase tracking-widest text-success mb-1">Completed this period</h4>
        {completed.length === 0 ? (
          <p className="text-xs text-text-secondary italic px-2">No tasks completed yet.</p>
        ) : (
          <ul className="flex flex-col gap-1 list-none p-0 m-0">{completed.map(row)}</ul>
        )}
      </section>
      <section>
        <h4 className="text-xs uppercase tracking-widest text-text-secondary mb-1">Still incomplete</h4>
        {incomplete.length === 0 ? (
          <p className="text-xs text-text-secondary italic px-2">Nothing left.</p>
        ) : (
          <ul className="flex flex-col gap-1 list-none p-0 m-0">{incomplete.map(row)}</ul>
        )}
      </section>
    </div>
  );
}
