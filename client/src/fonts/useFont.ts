import { useEffect } from 'react';
import { FONTS, type FontDef } from './fontConfig';
import { useSettings } from '../settings/useSettings';

function findFontByFamily(family: string): FontDef {
  return FONTS.find((f) => f.family === family) ?? FONTS[0]!;
}

function injectGoogleFontLink(font: FontDef): void {
  // Remove prior Simplidoro font links so only the active font is loaded (F-26).
  document.head.querySelectorAll('link[data-simplidoro-font]').forEach((n) => n.remove());
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${font.googleParam}&display=swap`;
  link.setAttribute('data-simplidoro-font', font.key);
  document.head.appendChild(link);
}

/**
 * Apply the active font from SettingsContext (settings.font).
 *
 * Re-runs whenever the font setting changes — covers all of:
 * - initial app boot (cookie or DB load populates settings)
 * - user changes font in Settings (DB write triggers context update)
 * - login transition (DB settings overwrite cookie via SettingsContext)
 *
 * Per Phase 2 audit (hardening): replaces the Phase 1 localStorage-based
 * implementation. The 'No localStorage anywhere' hard rule applies.
 */
export function useFont(): void {
  const { settings } = useSettings();
  useEffect(() => {
    const font = findFontByFamily(settings.font);
    document.documentElement.style.setProperty('--font-active', font.family);
    injectGoogleFontLink(font);
  }, [settings.font]);
}
