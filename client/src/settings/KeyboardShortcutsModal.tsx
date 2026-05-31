import { useEffect } from 'react';
import { useSettings } from './useSettings';
import { SHORTCUT_ACTIONS, effectiveBindings } from '../timer/state/shortcutActions';

// Help dialog — reads the live merged bindings (defaults + user overrides
// + master toggle) from settings, so it always reflects what's actually
// bound. Disabled actions render as "—" instead of a key.

interface Props { onClose: () => void; }

export function KeyboardShortcutsModal({ onClose }: Props): JSX.Element {
  const { settings } = useSettings();
  const bindings = effectiveBindings(settings.shortcut_bindings);

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
           className="bg-bg-primary border border-border rounded p-6 max-w-md w-full flex flex-col gap-4 max-h-[80vh] overflow-auto">
        <h3 id="shortcuts-title" className="text-lg text-text-primary">Keyboard shortcuts</h3>
        {!settings.shortcuts_enabled && (
          <p className="text-xs text-text-secondary italic">
            Shortcuts are currently disabled in Settings → Shortcuts.
          </p>
        )}
        <table className="text-sm text-text-secondary">
          <tbody>
            {SHORTCUT_ACTIONS.map((a) => {
              const key = bindings.get(a.id);
              return (
                <tr key={a.id}>
                  <td className="font-mono text-text-primary pr-4 py-1 whitespace-nowrap">
                    {key ?? <span className="text-text-secondary italic">—</span>}
                  </td>
                  <td className="py-1">{a.label}</td>
                </tr>
              );
            })}
            <tr>
              <td className="font-mono text-text-primary pr-4 py-1">Esc</td>
              <td className="py-1">Close modal / popup</td>
            </tr>
          </tbody>
        </table>
        <p className="text-xs text-text-secondary">
          Rebind any of these in Settings → Shortcuts.
        </p>
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
