import { describe, it, expect, beforeEach } from 'vitest';
import { readSettingsCookie, writeSettingsCookie, clearSettingsCookie, COOKIE_NAME } from './cookie';

function clearAllCookies() {
  document.cookie.split(';').forEach((c) => {
    const name = c.split('=')[0]?.trim();
    if (name) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  });
}

describe('settings cookie', () => {
  beforeEach(clearAllCookies);

  it('returns null when no cookie set', () => {
    expect(readSettingsCookie()).toBeNull();
  });

  it('writes and reads round-trip', () => {
    writeSettingsCookie({ theme: 'bw-dark', font: 'Inter' });
    expect(readSettingsCookie()).toEqual({ theme: 'bw-dark', font: 'Inter' });
  });

  it('overwrites existing', () => {
    writeSettingsCookie({ theme: 'bw-dark' });
    writeSettingsCookie({ font: 'Lora' });
    expect(readSettingsCookie()).toEqual({ font: 'Lora' });
  });

  it('returns null for malformed cookie value', () => {
    document.cookie = `${COOKIE_NAME}=not-json; path=/`;
    expect(readSettingsCookie()).toBeNull();
  });

  it('clearSettingsCookie removes it', () => {
    writeSettingsCookie({ theme: 'bw-dark' });
    clearSettingsCookie();
    expect(readSettingsCookie()).toBeNull();
  });
});
