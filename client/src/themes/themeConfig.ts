// Theme registry — Phase 6 Slice B (F-25).
//
// Adding a new theme = three coordinated changes:
//   1. Add a row here (key + display label)
//   2. Add a `[data-theme="<key>"]` block in client/src/theme.css
//   3. Add the key to server/utils/validateSettings.ts KNOWN_THEMES
//
// `key` is what gets written into settings.theme + the <html data-theme>
// attribute. `label` is what users see in the AppearanceSettings dropdown.

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

export function isKnownTheme(key: string): boolean {
  return THEMES.some((t) => t.key === key);
}
