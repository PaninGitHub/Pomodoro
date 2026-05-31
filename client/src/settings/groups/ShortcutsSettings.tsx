import { useEffect, useState } from 'react';
import { useSettings } from '../useSettings';
import {
  SHORTCUT_ACTIONS,
  effectiveBindings,
  formatKeyEvent,
  isModifierOnly,
  type ShortcutActionId,
  type ShortcutCategory,
} from '../../timer/state/shortcutActions';

// Phase 5.5 — bindable shortcuts UI.
// Master toggle + per-action rebind + per-action disable + reset all.

const CATEGORY_ORDER: ShortcutCategory[] = ['Timer', 'Navigation', 'Modals'];

const labelCls = 'flex items-center gap-2 text-sm text-text-secondary';

export function ShortcutsSettings(): JSX.Element {
  const { settings, updateSettings } = useSettings();
  const [capturing, setCapturing] = useState<ShortcutActionId | null>(null);
  const [error, setError] = useState<string | null>(null);

  const bindings = effectiveBindings(settings.shortcut_bindings);

  function saveBinding(id: ShortcutActionId, key: string | null): void {
    const action = SHORTCUT_ACTIONS.find((a) => a.id === id);
    if (!action) return;
    const current = settings.shortcut_bindings ?? {};
    const updated: Record<string, string | null> = { ...current };
    if (key === action.defaultKey) {
      // Matches default → strip from overrides so the row tracks the default
      delete updated[id];
    } else {
      updated[id] = key;
    }
    const next = Object.keys(updated).length === 0 ? null : updated;
    void updateSettings({ shortcut_bindings: next });
  }

  // Capture-mode keydown listener — runs while capturing !== null.
  // Attached at capture phase + stopPropagation so the global hotkey
  // listener doesn't also fire the bound action.
  useEffect(() => {
    if (capturing === null) return;
    const activeCapture = capturing; // narrow for closure

    function onKey(e: KeyboardEvent) {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'Escape') {
        setCapturing(null);
        setError(null);
        return;
      }
      if (isModifierOnly(e)) return; // wait for the actual key

      const newKey = formatKeyEvent(e);

      // Conflict check — any other action currently bound to this key?
      for (const [otherId, otherKey] of bindings) {
        if (otherId !== activeCapture && otherKey === newKey) {
          const otherMeta = SHORTCUT_ACTIONS.find((a) => a.id === otherId);
          setError(`"${newKey}" is already bound to "${otherMeta?.label ?? otherId}". Disable or remap it first.`);
          return; // stay in capture mode
        }
      }

      saveBinding(activeCapture, newKey);
      setCapturing(null);
      setError(null);
    }

    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
    // bindings is derived from settings.shortcut_bindings, which is in deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capturing, settings.shortcut_bindings]);

  function startCapture(id: ShortcutActionId): void {
    setError(null);
    setCapturing(id);
  }

  function cancelCapture(): void {
    setCapturing(null);
    setError(null);
  }

  function clearBinding(id: ShortcutActionId): void {
    saveBinding(id, null);
    setError(null);
  }

  function resetAll(): void {
    void updateSettings({ shortcut_bindings: null });
    setError(null);
  }

  const masterOff = !settings.shortcuts_enabled;

  return (
    <div className="flex flex-col gap-5">
      <label className={labelCls}>
        <input
          type="checkbox"
          checked={settings.shortcuts_enabled}
          onChange={(e) => void updateSettings({ shortcuts_enabled: e.target.checked })}
        />
        Enable keyboard shortcuts
      </label>

      {masterOff && (
        <p className="text-xs text-text-secondary italic">
          Shortcuts are off — bindings below are listed for reference but won’t fire until re-enabled.
        </p>
      )}

      {error && (
        <p role="alert" className="text-sm text-error border border-error rounded p-2">
          {error}
        </p>
      )}

      {CATEGORY_ORDER.map((cat) => (
        <section key={cat} className="flex flex-col gap-2">
          <h4 className="text-xs uppercase tracking-widest text-text-secondary border-b border-border pb-1">
            {cat}
          </h4>
          {SHORTCUT_ACTIONS.filter((a) => a.category === cat).map((action) => {
            const current = bindings.get(action.id);
            const isCapturing = capturing === action.id;
            const isDisabled = current === null;
            return (
              <div key={action.id} className="flex items-center justify-between gap-3 py-1">
                <span className={`text-sm ${masterOff ? 'text-text-secondary' : 'text-text-primary'}`}>
                  {action.label}
                  <span className="text-xs text-text-secondary ml-2">
                    (default: <span className="font-mono">{action.defaultKey}</span>
                    {action.scope === 'timer' && <span> · home only</span>})
                  </span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => (isCapturing ? cancelCapture() : startCapture(action.id))}
                    aria-label={isCapturing ? 'Cancel rebind' : `Rebind ${action.label}`}
                    className={`px-3 py-1 text-xs font-mono rounded border min-w-[120px] ${
                      isCapturing
                        ? 'border-accent text-accent'
                        : isDisabled
                          ? 'border-border text-text-secondary italic'
                          : 'border-border text-text-primary hover:bg-bg-secondary'
                    }`}
                  >
                    {isCapturing ? 'Press a key…' : (current ?? 'Disabled')}
                  </button>
                  {!isCapturing && !isDisabled && (
                    <button
                      type="button"
                      onClick={() => clearBinding(action.id)}
                      aria-label={`Disable ${action.label}`}
                      title="Disable this shortcut"
                      className="inline-flex items-center justify-center w-11 h-11 text-xs text-text-secondary hover:text-error"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      ))}

      <div className="border-t border-border pt-3 flex items-center justify-between gap-3">
        <p className="text-xs text-text-secondary">
          Esc during rebind cancels. Ctrl / Alt / Cmd combos are accepted; Shift is implicit in the
          character itself, so press the character you want (<span className="font-mono">?</span>,{' '}
          <span className="font-mono">!</span>, capital letters) directly.
        </p>
        <button
          type="button"
          onClick={resetAll}
          className="px-3 py-1 text-sm rounded border border-border text-text-secondary hover:bg-bg-secondary"
        >
          Reset all to defaults
        </button>
      </div>
    </div>
  );
}
