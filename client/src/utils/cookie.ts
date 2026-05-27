import Cookies from 'js-cookie';
import type { PartialSettings } from '../settings/settingsTypes';

export const COOKIE_NAME = 'simplidoro_settings';

export function readSettingsCookie(): PartialSettings | null {
  const raw = Cookies.get(COOKIE_NAME);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    return parsed as PartialSettings;
  } catch {
    return null;
  }
}

export function writeSettingsCookie(settings: PartialSettings): void {
  Cookies.set(COOKIE_NAME, JSON.stringify(settings), {
    expires: 365,
    sameSite: 'lax',
    secure: import.meta.env.PROD,
    path: '/',
  });
}

export function clearSettingsCookie(): void {
  Cookies.remove(COOKIE_NAME, { path: '/' });
}
