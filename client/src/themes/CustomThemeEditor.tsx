// CustomThemeEditor — modal for creating or editing a user theme.
// Phase 6 Slice B.
//
// Two modes:
//   - Create: `initial` is null. Slots seed from STARTER_CUSTOM_SLOTS.
//     Save derives a unique key from the label and appends a new entry
//     to settings.custom_themes.
//   - Edit:   `initial` is the existing CustomTheme. Slots + label seed
//     from it. Save replaces the entry with the same key. Delete removes
//     it (and reverts theme to default if it was active).
//
// Live preview: as the user picks a color, the slot is set as an inline
// CSS custom property on <html> immediately so the entire app re-themes
// in real time. Cancel restores; Save persists the inline state to
// settings.custom_themes (which then drives useTheme via the normal
// reactive path). Open while the active theme matches a custom key works
// fine — useTheme's cleanup runs because settings.theme didn't change.
//
// Persistence goes through updateSettings (auth → DB, guest → cookie).

import { useEffect, useRef, useState } from 'react';
import { useSettings } from '../settings/useSettings';
import { ModalOverlay } from '../ui/ModalOverlay';
import {
  STARTER_CUSTOM_SLOTS,
  SLOT_LABELS,
  deriveUniqueKey,
  DEFAULT_THEME_KEY,
} from './themeConfig';
import type { CustomTheme } from '../settings/settingsTypes';

const MAX_LABEL = 40;

interface Props {
  initial: CustomTheme | null;
  onClose: () => void;
}

export function CustomThemeEditor({ initial, onClose }: Props): JSX.Element {
  const { settings, updateSettings } = useSettings();
  const isEditing = initial !== null;

  const [label, setLabel] = useState(initial?.label ?? '');
  const [slots, setSlots] = useState<CustomTheme['slots']>(
    initial?.slots ?? STARTER_CUSTOM_SLOTS,
  );
  const [error, setError] = useState<string | null>(null);

  // Snapshot the inline-style state at mount so Cancel can restore it
  // even if useTheme already had a custom theme applied. The ref captures
  // the actual inline value (which may be empty if no custom was active).
  const originalInline = useRef<Record<string, string>>({});
  useEffect(() => {
    const html = document.documentElement;
    for (const { slot } of SLOT_LABELS) {
      originalInline.current[slot] = html.style.getPropertyValue(slot);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live-apply slots to <html> on every change so the whole app re-themes
  // as the user picks colors. Effect runs on each render-after-edit.
  useEffect(() => {
    const html = document.documentElement;
    for (const { slot } of SLOT_LABELS) {
      html.style.setProperty(slot, slots[slot]);
    }
  }, [slots]);

  function setSlot(slot: keyof CustomTheme['slots'], value: string) {
    setSlots((prev) => ({ ...prev, [slot]: value }));
  }

  function restoreInlineSnapshot() {
    const html = document.documentElement;
    for (const { slot } of SLOT_LABELS) {
      const orig = originalInline.current[slot];
      if (orig) html.style.setProperty(slot, orig);
      else html.style.removeProperty(slot);
    }
  }

  function cancel() {
    restoreInlineSnapshot();
    onClose();
  }

  async function save() {
    const trimmed = label.trim();
    if (!trimmed) {
      setError('Please name the theme.');
      return;
    }
    if (trimmed.length > MAX_LABEL) {
      setError(`Name must be ${MAX_LABEL} characters or fewer.`);
      return;
    }
    const key = isEditing ? initial.key : deriveUniqueKey(trimmed, settings.custom_themes);
    const next: CustomTheme = { key, label: trimmed, slots };
    const others = settings.custom_themes.filter((t) => t.key !== key);
    const updated = [...others, next].sort((a, b) => a.label.localeCompare(b.label));
    // Activate the theme on create; on edit keep the user's current
    // settings.theme (it may or may not be this key).
    const themePatch = isEditing ? {} : { theme: key };
    try {
      await updateSettings({ custom_themes: updated, ...themePatch });
      onClose();
    } catch {
      setError('Could not save. Try again.');
    }
  }

  async function remove() {
    if (!isEditing) return;
    if (!confirm(`Delete "${initial.label}"? This can't be undone.`)) return;
    const updated = settings.custom_themes.filter((t) => t.key !== initial.key);
    const themePatch = settings.theme === initial.key ? { theme: DEFAULT_THEME_KEY } : {};
    try {
      // Strip inline overrides BEFORE the settings update so the user sees
      // the new default theme instantly instead of stale custom inline.
      restoreInlineSnapshot();
      await updateSettings({ custom_themes: updated, ...themePatch });
      onClose();
    } catch {
      setError('Could not delete. Try again.');
    }
  }

  return (
    <ModalOverlay
      onClose={cancel}
      ariaLabel={isEditing ? `Edit theme ${initial.label}` : 'Create custom theme'}
      size={settings.modal_size}
    >
      <div className="flex flex-col gap-4 p-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg text-text-primary">
            {isEditing ? `Edit theme: ${initial.label}` : 'Create custom theme'}
          </h3>
          <button
            type="button"
            onClick={cancel}
            aria-label="Close"
            className="inline-flex items-center justify-center w-11 h-11 leading-none text-text-secondary hover:text-text-primary"
          >
            ×
          </button>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-text-secondary">Name</span>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={MAX_LABEL}
            placeholder="My Theme"
            aria-label="Theme name"
            className="px-2 py-1 bg-bg-secondary border border-border rounded text-text-primary placeholder:text-text-secondary"
          />
        </label>

        <div className="flex flex-col gap-2">
          <p className="text-xs text-text-secondary italic">
            Pick a color for each slot. Changes preview live across the whole app.
            The 3 semantic colors (error / warning / success) stay fixed.
          </p>
          <ul className="flex flex-col gap-2 list-none p-0 m-0">
            {SLOT_LABELS.map(({ slot, label: slotLabel, hint }) => (
              <li
                key={slot}
                className="flex items-center gap-3 px-2 py-2 border border-border rounded bg-bg-secondary"
              >
                <input
                  type="color"
                  value={slots[slot]}
                  onChange={(e) => setSlot(slot, e.target.value)}
                  aria-label={`${slotLabel} color`}
                  className="w-11 h-11 rounded border border-border bg-transparent cursor-pointer"
                />
                <div className="flex-1 flex flex-col">
                  <span className="text-sm text-text-primary">{slotLabel}</span>
                  <span className="text-xs text-text-secondary">{hint}</span>
                </div>
                <span className="font-mono text-xs text-text-secondary uppercase">{slots[slot]}</span>
              </li>
            ))}
          </ul>
        </div>

        {error && (
          <p role="alert" className="text-sm text-error border border-error rounded p-2">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between gap-3 pt-2 border-t border-border">
          {isEditing ? (
            <button
              type="button"
              onClick={() => void remove()}
              className="px-4 py-2 rounded border border-error text-error hover:bg-error hover:text-bg-primary"
            >
              Delete theme
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={cancel}
              className="px-4 py-2 rounded border border-border text-text-secondary hover:bg-bg-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={!label.trim()}
              className="px-4 py-2 rounded bg-accent text-bg-primary font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isEditing ? 'Save changes' : 'Create theme'}
            </button>
          </div>
        </div>
      </div>
    </ModalOverlay>
  );
}
