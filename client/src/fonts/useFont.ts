import { useEffect } from 'react';
import { FONTS, DEFAULT_FONT_KEY, LS_FONT_KEY, type FontDef } from './fontConfig';

function findFont(key: string | null): FontDef {
  if (!key) return FONTS[0]!;
  const found = FONTS.find((f) => f.key === key);
  return found ?? FONTS[0]!;
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
 * Apply the active font: read from localStorage (or default), persist back,
 * set the --font-active CSS variable, and inject the Google Fonts <link>.
 * TODO(phase-2): expose a setter when the Settings page ships.
 */
export function useFont(): void {
  useEffect(() => {
    const stored = localStorage.getItem(LS_FONT_KEY);
    const font = findFont(stored);
    if (stored !== font.key) {
      localStorage.setItem(LS_FONT_KEY, font.key);
    }
    if (stored === null) {
      // Ensure default key is persisted on first mount even when findFont returned the default.
      localStorage.setItem(LS_FONT_KEY, DEFAULT_FONT_KEY);
    }
    document.documentElement.style.setProperty('--font-active', font.family);
    injectGoogleFontLink(font);
  }, []);
}
