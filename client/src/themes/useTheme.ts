import { useEffect } from 'react';
import { useSettings } from '../settings/useSettings';
import { DEFAULT_THEME_KEY, isKnownTheme } from './themeConfig';

// 8 slot keys — must match keys in CustomTheme.slots. Listed here so the
// useTheme effect knows which inline styles to set + clear on each tick.
const CUSTOM_SLOT_NAMES = [
  '--color-bg-primary',
  '--color-bg-secondary',
  '--color-bg-tertiary',
  '--color-text-primary',
  '--color-text-secondary',
  '--color-accent',
  '--color-border',
  '--color-timer',
] as const;

/**
 * Apply the active theme from SettingsContext (settings.theme) by writing
 * to the <html data-theme="..."> attribute. The matching `[data-theme]`
 * CSS block in theme.css then takes over via the cascade — every component
 * that reads a `--color-*` custom property re-resolves automatically.
 *
 * Custom themes (settings.custom_themes) don't have a CSS block — instead
 * their 8 slot colors are set as inline styles on <html>. Inline styles
 * have higher specificity than the [data-theme] rules so they win even
 * when data-theme matches a built-in key.
 *
 * Mirrors the useFont pattern. Re-runs whenever settings.theme OR the
 * matching custom-theme entry changes, covering:
 *   - initial app boot (cookie or DB load populates settings)
 *   - user picks a theme in Settings → Appearance
 *   - user edits a custom theme's slots (live re-apply)
 *   - user deletes the active custom theme (falls back to default)
 *   - login transition (DB settings overwrite cookie via SettingsContext)
 */
export function useTheme(): void {
  const { settings } = useSettings();
  const matchingCustom = settings.custom_themes.find((t) => t.key === settings.theme);

  useEffect(() => {
    const html = document.documentElement;

    if (matchingCustom) {
      // Custom theme: set the data-theme attr to the custom key so any
      // selectors that match on the attr still trigger; then layer the
      // slot values as inline styles. The base [data-theme="bw-dark"]
      // :root block still provides the 3 fixed semantic colors and the
      // --font-active fallback (custom themes don't override semantics
      // per F-25 convention).
      html.setAttribute('data-theme', matchingCustom.key);
      for (const slot of CUSTOM_SLOT_NAMES) {
        html.style.setProperty(slot, matchingCustom.slots[slot]);
      }
      return () => {
        // Clean up inline styles when the effect re-runs with a non-custom
        // theme — otherwise stale inline overrides would shadow the new
        // [data-theme] block's colors.
        for (const slot of CUSTOM_SLOT_NAMES) {
          html.style.removeProperty(slot);
        }
      };
    }

    // Built-in theme — or unknown key (treat as default). Strip inline
    // overrides first in case we just came from a custom theme.
    for (const slot of CUSTOM_SLOT_NAMES) {
      html.style.removeProperty(slot);
    }
    const themeKey = isKnownTheme(settings.theme) ? settings.theme : DEFAULT_THEME_KEY;
    html.setAttribute('data-theme', themeKey);
  }, [settings.theme, matchingCustom]);
}
