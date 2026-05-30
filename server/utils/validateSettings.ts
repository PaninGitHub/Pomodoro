import type { PartialSettings } from '../types/db';

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

const KNOWN_THEMES = ['bw-dark'] as const;
const KNOWN_FONTS = ['Inter', 'Open Sans', 'DM Mono', 'Merriweather', 'Lora', 'EB Garamond', 'Caveat'] as const;
const KNOWN_HOUR_FORMATS = ['12h', '24h'] as const;
const KNOWN_ALARM_SOUNDS = ['bell', 'bird', 'digital', 'kitchen', 'custom'] as const;
const KNOWN_LAST_SOUND = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7'] as const;
const CUSTOM_URL_EXTS = /\.(mp3|ogg|wav|m4a|webm)$/i;
const MAX_CUSTOM_URL_LEN = 2048;

function isBool(v: unknown): v is boolean { return typeof v === 'boolean'; }
function isInt(v: unknown): v is number { return typeof v === 'number' && Number.isInteger(v); }
function isFiniteNum(v: unknown): v is number { return typeof v === 'number' && Number.isFinite(v); }
function isStr(v: unknown): v is string { return typeof v === 'string'; }

function intRange(v: unknown, min: number, max: number, field: string): Result<number> {
  if (!isInt(v)) return { ok: false, error: `${field} must be a whole number.` };
  if (v < min || v > max) return { ok: false, error: `${field} must be between ${min} and ${max}.` };
  return { ok: true, value: v };
}

function enumOf<T extends readonly string[]>(v: unknown, values: T, field: string): Result<T[number]> {
  if (!isStr(v) || !values.includes(v as T[number])) {
    return { ok: false, error: `${field} must be one of: ${values.join(', ')}.` };
  }
  return { ok: true, value: v as T[number] };
}

function boolField(v: unknown, field: string): Result<boolean> {
  if (!isBool(v)) return { ok: false, error: `${field} must be a boolean.` };
  return { ok: true, value: v };
}

function validateFreestyleRatio(v: unknown): Result<number> {
  if (!isFiniteNum(v)) return { ok: false, error: 'freestyle_ratio must be a number.' };
  if (v <= 0) return { ok: false, error: 'freestyle_ratio must be greater than 0.' };
  // Round to 2 decimal places per Batch B C-04
  return { ok: true, value: Math.round(v * 100) / 100 };
}

function validateCustomUrl(v: unknown): Result<string | null> {
  if (v === null) return { ok: true, value: null };
  if (!isStr(v)) return { ok: false, error: 'alarm_custom_url must be a string or null.' };
  if (v.length > MAX_CUSTOM_URL_LEN) {
    return { ok: false, error: `alarm_custom_url must be ${MAX_CUSTOM_URL_LEN} characters or fewer.` };
  }
  if (!v.startsWith('https://')) {
    return { ok: false, error: 'alarm_custom_url must use https://.' };
  }
  if (!CUSTOM_URL_EXTS.test(v)) {
    return { ok: false, error: 'alarm_custom_url must end in .mp3, .ogg, .wav, .m4a, or .webm.' };
  }
  return { ok: true, value: v };
}

type FieldValidator<K extends keyof PartialSettings> = (v: unknown) => Result<PartialSettings[K]>;

const FIELD_VALIDATORS: { [K in keyof PartialSettings]: FieldValidator<K> } = {
  work_duration:         (v) => intRange(v, 1, 720, 'work_duration'),
  short_break_duration:  (v) => intRange(v, 1, 720, 'short_break_duration'),
  long_break_duration:   (v) => intRange(v, 1, 720, 'long_break_duration'),
  long_break_frequency:  (v) => intRange(v, 0, 99, 'long_break_frequency'),
  auto_start_breaks:     (v) => boolField(v, 'auto_start_breaks'),
  auto_start_pomodoros:  (v) => boolField(v, 'auto_start_pomodoros'),
  freestyle_ratio:       validateFreestyleRatio,
  freestyle_accumulate:  (v) => boolField(v, 'freestyle_accumulate'),
  alarm_sound:           (v) => enumOf(v, KNOWN_ALARM_SOUNDS, 'alarm_sound'),
  alarm_volume:          (v) => intRange(v, 0, 100, 'alarm_volume'),
  alarm_repeats:         (v) => intRange(v, 1, 5, 'alarm_repeats'),
  alarm_custom_url:      validateCustomUrl,
  browser_notifications: (v) => boolField(v, 'browser_notifications'),
  reflection_enabled:    (v) => boolField(v, 'reflection_enabled'),
  music_autoplay:        (v) => boolField(v, 'music_autoplay'),
  music_volume:          (v) => intRange(v, 0, 100, 'music_volume'),
  last_sound_selected:   (v) => enumOf(v, KNOWN_LAST_SOUND, 'last_sound_selected'),
  break_activity_limit:  (v) => intRange(v, 1, 30, 'break_activity_limit'),
  theme:                 (v) => enumOf(v, KNOWN_THEMES, 'theme'),
  font:                  (v) => enumOf(v, KNOWN_FONTS, 'font'),
  hour_format:           (v) => enumOf(v, KNOWN_HOUR_FORMATS, 'hour_format'),
  timer_adjust_step_minutes: (v) => intRange(v, 1, 60, 'timer_adjust_step_minutes'),
  freestyle_breaks_enabled: (v) => boolField(v, 'freestyle_breaks_enabled'),
};

const KNOWN_FIELDS = Object.keys(FIELD_VALIDATORS) as (keyof PartialSettings)[];

export function validatePartialSettings(body: unknown): Result<PartialSettings> {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, error: 'Invalid request body.' };
  }
  const b = body as Record<string, unknown>;
  const out: PartialSettings = {};

  for (const field of KNOWN_FIELDS) {
    if (!(field in b)) continue;
    const validator = FIELD_VALIDATORS[field];
    if (!validator) continue; // unreachable: KNOWN_FIELDS comes from the map keys
    const r = validator(b[field]);
    if (!r.ok) return r;
    (out as Record<string, unknown>)[field] = r.value;
  }

  if (Object.keys(out).length === 0) {
    return { ok: false, error: 'Provide at least one settable field.' };
  }
  return { ok: true, value: out };
}
