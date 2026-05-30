import { useEffect } from 'react';
import { useTasks } from './useTasks';

interface Props { onClose: () => void; }

export function ClearAllTasksModal({ onClose }: Props): JSX.Element {
  const { tasks, clearAllTasks } = useTasks();

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function confirm() {
    await clearAllTasks();
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="clear-all-title"
      onClick={onClose}
      className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-bg-primary border border-border rounded p-6 max-w-sm w-full flex flex-col gap-4"
      >
        <h3 id="clear-all-title" className="text-lg text-text-primary">Clear all tasks?</h3>
        <p className="text-sm text-text-secondary">
          This will remove all {tasks.length} task{tasks.length === 1 ? '' : 's'} from your list. This cannot be undone.
        </p>
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose}
                  className="px-4 py-1 rounded border border-border bg-bg-secondary text-text-primary hover:bg-bg-tertiary">
            Cancel
          </button>
          <button type="button" onClick={() => void confirm()}
                  className="px-4 py-1 rounded border border-error text-error hover:bg-error hover:text-bg-primary">
            Clear all
          </button>
        </div>
      </div>
    </div>
  );
}
