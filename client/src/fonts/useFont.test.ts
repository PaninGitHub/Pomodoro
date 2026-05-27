import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { useFont } from './useFont';
import { FONTS, DEFAULT_FONT_FAMILY } from './fontConfig';
import { SettingsContext } from '../settings/SettingsContext';
import { DEFAULT_SETTINGS, type Settings } from '../settings/settingsTypes';

// Lightweight test wrapper that injects a frozen SettingsContext value.
// useFont only reads `settings.font` — updateSettings is a no-op here.
function makeWrapper(font: string) {
  const value = {
    settings: { ...DEFAULT_SETTINGS, font } as Settings,
    updateSettings: async () => {},
  };
  return ({ children }: { children: ReactNode }) =>
    createElement(SettingsContext.Provider, { value }, children);
}

describe('useFont', () => {
  beforeEach(() => {
    document.head.querySelectorAll('link[data-simplidoro-font]').forEach((n) => n.remove());
    document.documentElement.style.removeProperty('--font-active');
  });

  it('applies the default font family from SettingsContext to --font-active', async () => {
    renderHook(() => useFont(), { wrapper: makeWrapper(DEFAULT_FONT_FAMILY) });
    await waitFor(() => {
      const val = document.documentElement.style.getPropertyValue('--font-active');
      expect(val).toBe(FONTS[0]!.family);
    });
  });

  it('injects a Google Fonts <link> tag for the active font', async () => {
    renderHook(() => useFont(), { wrapper: makeWrapper(DEFAULT_FONT_FAMILY) });
    await waitFor(() => {
      const link = document.head.querySelector('link[data-simplidoro-font]') as HTMLLinkElement | null;
      expect(link).not.toBeNull();
      expect(link!.href).toContain('Inter');
      expect(link!.href).toContain('display=swap');
    });
  });

  it('applies a non-default font when SettingsContext.font is set to it', async () => {
    renderHook(() => useFont(), { wrapper: makeWrapper('Lora') });
    await waitFor(() => {
      const val = document.documentElement.style.getPropertyValue('--font-active');
      expect(val).toBe('Lora');
    });
    const link = document.head.querySelector('link[data-simplidoro-font]') as HTMLLinkElement | null;
    expect(link).not.toBeNull();
    expect(link!.href).toContain('Lora');
  });

  it('falls back to the default font when settings.font is unknown', async () => {
    renderHook(() => useFont(), { wrapper: makeWrapper('Nonexistent Font Family') });
    await waitFor(() => {
      const val = document.documentElement.style.getPropertyValue('--font-active');
      expect(val).toBe(FONTS[0]!.family);
    });
  });

  it('does not touch localStorage', () => {
    // Tripwire: the hard rule is "No localStorage anywhere". If this hook ever
    // regresses to localStorage, the spy here will catch it.
    const setSpy = vi.spyOn(Storage.prototype, 'setItem');
    const getSpy = vi.spyOn(Storage.prototype, 'getItem');
    renderHook(() => useFont(), { wrapper: makeWrapper(DEFAULT_FONT_FAMILY) });
    expect(setSpy).not.toHaveBeenCalled();
    expect(getSpy).not.toHaveBeenCalled();
    setSpy.mockRestore();
    getSpy.mockRestore();
  });
});
