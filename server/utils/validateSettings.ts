import type { PartialSettings } from '../types/db';

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

// Must mirror client/src/themes/themeConfig.ts THEMES exactly (Phase 6 Slice B).
// Adding a new theme = update both lists + add a CSS block in client/src/theme.css.
const KNOWN_THEMES = [
  'bw-dark',
  'amber-opus',
  'high-contrast',
  'parchment',
  'summer-sunset',
] as const;
const KNOWN_FONTS = ['Inter', 'Open Sans', 'DM Mono', 'Merriweather', 'Lora', 'EB Garamond', 'Caveat'] as const;
const KNOWN_HOUR_FORMATS = ['12h', '24h'] as const;
const KNOWN_WEEK_STARTS = ['sunday', 'monday'] as const;
const KNOWN_LAYOUT_DENSITIES = ['auto', 'tabs', 'collapsible'] as const;
const KNOWN_MODAL_SIZES = ['small', 'medium', 'large'] as const;

const MAX_ACTION_ID_LEN = 64;
const MAX_BINDING_LEN = 50;

function validateShortcutBindings(v: unknown): Result<Record<string, string | null> | null> {
  // null = "use built-in defaults". Empty object = "no overrides" (also
  // effectively defaults). Object = partial overrides keyed by action_id.
  // Server only enforces structural shape; the client owns action_id
  // canonicality and silently ignores stale overrides for removed actions.
  if (v === null) return { ok: true, value: null };
  if (typeof v !== 'object' || Array.isArray(v)) {
    return { ok: false, error: 'shortcut_bindings must be an object or null.' };
  }
  const out: Record<string, string | null> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (typeof k !== 'string' || k.length === 0 || k.length > MAX_ACTION_ID_LEN) {
      return { ok: false, error: `Invalid action id: ${k}.` };
    }
    if (val === null) { out[k] = null; continue; }
    if (typeof val !== 'string' || val.length === 0 || val.length > MAX_BINDING_LEN) {
      return { ok: false, error: `Binding for ${k} must be a non-empty string or null.` };
    }
    out[k] = val;
  }
  return { ok: true, value: out };
}
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
  show_avatar:              (v) => boolField(v, 'show_avatar'),
  freestyle_target_minutes: (v) => intRange(v, 1, 720, 'freestyle_target_minutes'),
  show_hours:               (v) => boolField(v, 'show_hours'),
  week_start:               (v) => enumOf(v, KNOWN_WEEK_STARTS, 'week_start'),
  layout_density:           (v) => enumOf(v, KNOWN_LAYOUT_DENSITIES, 'layout_density'),
  modal_size:               (v) => enumOf(v, KNOWN_MODAL_SIZES, 'modal_size'),
  shortcuts_enabled:        (v) => boolField(v, 'shortcuts_enabled'),
  shortcut_bindings:        validateShortcutBindings,
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
