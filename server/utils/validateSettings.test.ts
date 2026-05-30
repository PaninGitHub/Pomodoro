import { describe, it, expect } from 'vitest';
import { validatePartialSettings } from './validateSettings';

describe('validatePartialSettings', () => {
  it('accepts a valid partial body', () => {
    const r = validatePartialSettings({ work_duration: 30, theme: 'bw-dark' });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual({ work_duration: 30, theme: 'bw-dark' });
  });
  it('rejects empty body', () => {
    expect(validatePartialSettings({}).ok).toBe(false);
  });
  it('strips unknown fields silently', () => {
    const r = validatePartialSettings({ work_duration: 30, hacker_field: 'evil' });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual({ work_duration: 30 });
  });
  it('validates work_duration range (1-720)', () => {
    expect(validatePartialSettings({ work_duration: 0 }).ok).toBe(false);
    expect(validatePartialSettings({ work_duration: 721 }).ok).toBe(false);
    expect(validatePartialSettings({ work_duration: 1 }).ok).toBe(true);
    expect(validatePartialSettings({ work_duration: 720 }).ok).toBe(true);
  });
  it('validates long_break_frequency min 0', () => {
    expect(validatePartialSettings({ long_break_frequency: -1 }).ok).toBe(false);
    expect(validatePartialSettings({ long_break_frequency: 0 }).ok).toBe(true);
  });
  it('validates freestyle_ratio > 0 and rounds to 2 decimal places', () => {
    expect(validatePartialSettings({ freestyle_ratio: 0 }).ok).toBe(false);
    expect(validatePartialSettings({ freestyle_ratio: 5 }).ok).toBe(true);
    expect(validatePartialSettings({ freestyle_ratio: 5.55 }).ok).toBe(true);
    const r = validatePartialSettings({ freestyle_ratio: 5.555 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.freestyle_ratio).toBe(5.56);
  });
  it('validates alarm_volume 0-100', () => {
    expect(validatePartialSettings({ alarm_volume: -1 }).ok).toBe(false);
    expect(validatePartialSettings({ alarm_volume: 101 }).ok).toBe(false);
    expect(validatePartialSettings({ alarm_volume: 50 }).ok).toBe(true);
  });
  it('validates alarm_repeats 1-5', () => {
    expect(validatePartialSettings({ alarm_repeats: 0 }).ok).toBe(false);
    expect(validatePartialSettings({ alarm_repeats: 6 }).ok).toBe(false);
    expect(validatePartialSettings({ alarm_repeats: 3 }).ok).toBe(true);
  });
  it('validates alarm_custom_url (https + supported ext + max 2048 chars)', () => {
    expect(validatePartialSettings({ alarm_custom_url: 'http://insecure.com/bell.mp3' }).ok).toBe(false);
    expect(validatePartialSettings({ alarm_custom_url: 'https://ok.com/bell.mp3' }).ok).toBe(true);
    expect(validatePartialSettings({ alarm_custom_url: 'https://ok.com/bell.wav' }).ok).toBe(true);
    expect(validatePartialSettings({ alarm_custom_url: 'https://ok.com/bell.exe' }).ok).toBe(false);
    expect(validatePartialSettings({ alarm_custom_url: 'https://' + 'a'.repeat(2050) + '.mp3' }).ok).toBe(false);
    expect(validatePartialSettings({ alarm_custom_url: null }).ok).toBe(true); // null clears it
  });
  it('validates theme is a known theme key', () => {
    expect(validatePartialSettings({ theme: 'bw-dark' }).ok).toBe(true);
    expect(validatePartialSettings({ theme: 'unknown' }).ok).toBe(false);
  });
  it('validates font is a known font key', () => {
    expect(validatePartialSettings({ font: 'Inter' }).ok).toBe(true);
    expect(validatePartialSettings({ font: 'Comic Sans MS' }).ok).toBe(false);
  });
  it("validates hour_format is '12h' or '24h'", () => {
    expect(validatePartialSettings({ hour_format: '12h' }).ok).toBe(true);
    expect(validatePartialSettings({ hour_format: '24h' }).ok).toBe(true);
    expect(validatePartialSettings({ hour_format: '13h' }).ok).toBe(false);
  });
  it('validates break_activity_limit 1-30', () => {
    expect(validatePartialSettings({ break_activity_limit: 0 }).ok).toBe(false);
    expect(validatePartialSettings({ break_activity_limit: 31 }).ok).toBe(false);
    expect(validatePartialSettings({ break_activity_limit: 10 }).ok).toBe(true);
  });
  it('validates booleans must be boolean', () => {
    expect(validatePartialSettings({ auto_start_breaks: 'true' }).ok).toBe(false);
    expect(validatePartialSettings({ auto_start_breaks: true }).ok).toBe(true);
  });
  it('validates alarm_sound is a known key', () => {
    expect(validatePartialSettings({ alarm_sound: 'bell' }).ok).toBe(true);
    expect(validatePartialSettings({ alarm_sound: 'kazoo' }).ok).toBe(false);
  });
});
