import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useFont } from './useFont';
import { LS_FONT_KEY, DEFAULT_FONT_KEY, FONTS } from './fontConfig';

describe('useFont', () => {
  beforeEach(() => {
    localStorage.clear();
    document.head.querySelectorAll('link[data-simplidoro-font]').forEach((n) => n.remove());
    document.documentElement.style.removeProperty('--font-active');
  });

  it('writes the default font key to localStorage on first mount', async () => {
    renderHook(() => useFont());
    await waitFor(() => {
      expect(localStorage.getItem(LS_FONT_KEY)).toBe(DEFAULT_FONT_KEY);
    });
  });

  it('sets --font-active CSS variable to the default font family', async () => {
    renderHook(() => useFont());
    await waitFor(() => {
      const val = document.documentElement.style.getPropertyValue('--font-active');
      expect(val).toBe(FONTS[0]!.family);
    });
  });

  it('injects a Google Fonts <link> tag for the default font', async () => {
    renderHook(() => useFont());
    await waitFor(() => {
      const link = document.head.querySelector('link[data-simplidoro-font]') as HTMLLinkElement | null;
      expect(link).not.toBeNull();
      expect(link!.href).toContain('Inter');
      expect(link!.href).toContain('display=swap');
    });
  });

  it('reads the stored key on subsequent mounts', async () => {
    localStorage.setItem(LS_FONT_KEY, 'lora');
    renderHook(() => useFont());
    await waitFor(() => {
      const val = document.documentElement.style.getPropertyValue('--font-active');
      expect(val).toBe('Lora');
    });
  });

  it('falls back to default if stored key is unknown', async () => {
    localStorage.setItem(LS_FONT_KEY, 'unknown-font-key');
    renderHook(() => useFont());
    await waitFor(() => {
      expect(localStorage.getItem(LS_FONT_KEY)).toBe(DEFAULT_FONT_KEY);
    });
  });
});
