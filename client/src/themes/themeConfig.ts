// Theme registry — Phase 6 Slice B (F-25).
//
// Adding a new built-in theme = three coordinated changes:
//   1. Add a row here (key + display label)
//   2. Add a `[data-theme="<key>"]` block in client/src/theme.css
//   3. Add the key to server/utils/validateSettings.ts KNOWN_THEMES
//
// User custom themes live in settings.custom_themes and are merged with
// THEMES at display time (AppearanceSettings) — no theme.css block, no
// validator entry. Their 8 slot values are applied as inline styles on
// <html> by useTheme.
//
// `key` is what gets written into settings.theme + the <html data-theme>
// attribute. `label` is what users see in the AppearanceSettings dropdown.

import type { CustomTheme } from '../settings/settingsTypes';

export interface ThemeDef {
  key: string;
  label: string;
}

// Order matters: index 0 is the default (mirrors settings.theme default
// of 'bw-dark' in migrations/007 and DEFAULT_SETTINGS).
export const THEMES: readonly ThemeDef[] = [
  { key: 'bw-dark',        label: 'Black & White (Dark)' },
  { key: 'amber-opus',     label: 'Amber Opus' },
  { key: 'high-contrast',  label: 'High Contrast' },
  { key: 'parchment',      label: 'Parchment (Light)' },
  { key: 'summer-sunset',  label: 'Summer Sunset' },
] as const;

export const DEFAULT_THEME_KEY = THEMES[0]!.key;
const BUILT_IN_KEYS = new Set(THEMES.map((t) => t.key));

export function isKnownTheme(key: string): boolean {
  return BUILT_IN_KEYS.has(key);
}

// Starter palette for new custom themes — Amber Opus values. Picked
// because the contrasts are known-good and the warmth gives users an
// aesthetic baseline to riff on rather than starting from black on black.
export const STARTER_CUSTOM_SLOTS: CustomTheme['slots'] = {
  '--color-bg-primary':    '#1c1816',
  '--color-bg-secondary':  '#2d2622',
  '--color-bg-tertiary':   '#3f342d',
  '--color-text-primary':  '#f4ecd8',
  '--color-text-secondary':'#9c8a78',
  '--color-accent':        '#cc785c',
  '--color-border':        '#5a4a3c',
  '--color-timer':         '#d4a574',
};

// 8 slots in display order with user-friendly labels. The editor walks
// this list to render its rows so reordering/renaming the UI requires
// no component changes.
export const SLOT_LABELS: ReadonlyArray<{
  slot: keyof CustomTheme['slots'];
  label: string;
  hint: string;
}> = [
  { slot: '--color-bg-primary',    label: 'Page background',  hint: 'Deepest layer behind everything' },
  { slot: '--color-bg-secondary',  label: 'Cards & inputs',   hint: 'One step up from primary' },
  { slot: '--color-bg-tertiary',   label: 'Hover surfaces',   hint: 'Hover/active backgrounds' },
  { slot: '--color-text-primary',  label: 'Main text',        hint: 'Headings, body, task names' },
  { slot: '--color-text-secondary',label: 'Muted text',       hint: 'Captions, hints, placeholders' },
  { slot: '--color-accent',        label: 'Active / focus',   hint: 'Buttons, focus ring, mode-tab pill' },
  { slot: '--color-border',        label: 'Borders',          hint: 'Card edges, divider lines' },
  { slot: '--color-timer',         label: 'Timer digits',     hint: 'The giant clock numbers only' },
];

// 1–32 chars, lowercase a–z 0–9 -, starts with letter/digit. Must mirror
// server/utils/validateSettings.ts CUSTOM_THEME_KEY_RE exactly.
const KEY_RE = /^[a-z0-9][a-z0-9-]{0,31}$/;

/**
 * Derive a URL-safe slug from the user-entered label, falling back to
 * "theme" if the label has no alphanumerics. Appends "-N" suffix on
 * collision against built-in keys or the user's existing custom themes.
 *
 * Returns a key guaranteed to match KEY_RE and not collide with anything
 * already used. Caller still wraps in a try in case the existing set is
 * pathological (~100 themes with the same base).
 */
export function deriveUniqueKey(label: string, existing: readonly CustomTheme[]): string {
  const used = new Set<string>([...BUILT_IN_KEYS, ...existing.map((t) => t.key)]);
  const base = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 28); // leave headroom for "-NN" suffix while staying under 32-char cap
  const sanitized = base.length > 0 ? base : 'theme';
  if (KEY_RE.test(sanitized) && !used.has(sanitized)) return sanitized;
  for (let n = 2; n < 1000; n++) {
    const candidate = `${sanitized}-${n}`;
    if (KEY_RE.test(candidate) && !used.has(candidate)) return candidate;
  }
  // Pathological fallback — append timestamp.
  return `theme-${Date.now().toString(36)}`.slice(0, 32);
}
