import { useEffect } from 'react';
import { useSettings } from '../settings/useSettings';
import { DEFAULT_THEME_KEY, isKnownTheme } from './themeConfig';

/**
 * Apply the active theme from SettingsContext (settings.theme) by writing
 * to the <html data-theme="..."> attribute. The matching `[data-theme]`
 * CSS block in theme.css then takes over via the cascade — every component
 * that reads a `--color-*` custom property re-resolves automatically.
 *
 * Mirrors the useFont pattern. Re-runs whenever settings.theme changes,
 * covering:
 *   - initial app boot (cookie or DB load populates settings)
 *   - user picks a theme in Settings → Appearance
 *   - login transition (DB settings overwrite cookie via SettingsContext)
 *
 * Unknown theme keys fall back to the default — guards against stale
 * cookies if a theme key is ever removed.
 */
export function useTheme(): void {
  const { settings } = useSettings();
  useEffect(() => {
    const themeKey = isKnownTheme(settings.theme) ? settings.theme : DEFAULT_THEME_KEY;
    document.documentElement.setAttribute('data-theme', themeKey);
  }, [settings.theme]);
}
