import { useEffect } from 'react';

const SHORTCUTS = [
  { label: 'Space',  action: 'Start / Pause timer' },
  { label: 'R',      action: 'Abandon / reset period' },
  { label: 'N',      action: 'Skip to next period' },
  { label: 'S',      action: 'Open settings' },
  { label: 'M',      action: 'Toggle music (Phase 7)' },
  { label: 'T',      action: 'Open reports (Phase 5)' },
  { label: 'Esc',    action: 'Close modal / popup' },
];

interface Props { onClose: () => void; }

export function KeyboardShortcutsModal({ onClose }: Props): JSX.Element {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="shortcuts-title"
         className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
         onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
           className="bg-bg-primary border border-border rounded p-6 max-w-md w-full flex flex-col gap-4">
        <h3 id="shortcuts-title" className="text-lg text-text-primary">Keyboard shortcuts</h3>
        <table className="text-sm text-text-secondary">
          <tbody>
            {SHORTCUTS.map((s) => (
              <tr key={s.label}>
                <td className="font-mono text-text-primary pr-4 py-1">{s.label}</td>
                <td className="py-1">{s.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-end">
          <button type="button" onClick={onClose}
                  className="px-4 py-2 rounded border border-border bg-bg-secondary hover:bg-bg-tertiary text-text-primary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
