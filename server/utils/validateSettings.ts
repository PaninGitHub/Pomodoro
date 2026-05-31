import type { PartialSettings, CustomTheme } from '../types/db';

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

// Must mirror client/src/themes/themeConfig.ts THEMES exactly (Phase 6 Slice B).
// Adding a new built-in theme = update both lists + add a CSS block in
// client/src/theme.css. User custom themes (settings.custom_themes) are
// also accepted by theme validation — see acceptedThemeKeys() below.
const KNOWN_THEMES = [
  'bw-dark',
  'amber-opus',
  'high-contrast',
  'parchment',
  'summer-sunset',
] as const;

// Phase 6 Slice B — custom theme constraints.
const MAX_CUSTOM_THEMES = 10;
const CUSTOM_THEME_KEY_RE = /^[a-z0-9][a-z0-9-]{0,31}$/;       // 1–32 chars, slug
const CUSTOM_THEME_LABEL_MAX = 40;
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;                       // strict 6-digit hex
const REQUIRED_SLOTS = [
  '--color-bg-primary',
  '--color-bg-secondary',
  '--color-bg-tertiary',
  '--color-text-primary',
  '--color-text-secondary',
  '--color-accent',
  '--color-border',
  '--color-timer',
] as const;

function validateCustomThemes(v: unknown): Result<CustomTheme[]> {
  if (!Array.isArray(v)) {
    return { ok: false, error: 'custom_themes must be an array.' };
  }
  if (v.length > MAX_CUSTOM_THEMES) {
    return { ok: false, error: `custom_themes capped at ${MAX_CUSTOM_THEMES} entries.` };
  }
  const seenKeys = new Set<string>();
  for (const KNOWN of KNOWN_THEMES) seenKeys.add(KNOWN); // built-in keys reserved
  const out: CustomTheme[] = [];
  for (const item of v) {
    if (typeof item !== 'object' || item === null) {
      return { ok: false, error: 'Each custom theme must be an object.' };
    }
    const t = item as Record<string, unknown>;
    if (typeof t.key !== 'string' || !CUSTOM_THEME_KEY_RE.test(t.key)) {
      return { ok: false, error: 'Custom theme key must be 1–32 chars, lowercase a–z 0–9 -, and start with a letter/digit.' };
    }
    if (seenKeys.has(t.key)) {
      return { ok: false, error: `Custom theme key "${t.key}" duplicates a built-in or another custom theme.` };
    }
    seenKeys.add(t.key);
    if (typeof t.label !== 'string' || t.label.length === 0 || t.label.length > CUSTOM_THEME_LABEL_MAX) {
      return { ok: false, error: `Custom theme label must be 1–${CUSTOM_THEME_LABEL_MAX} characters.` };
    }
    if (typeof t.slots !== 'object' || t.slots === null) {
      return { ok: false, error: `Custom theme "${t.key}" missing slots object.` };
    }
    const slots = t.slots as Record<string, unknown>;
    const outSlots: Record<string, string> = {};
    for (const slotName of REQUIRED_SLOTS) {
      const val = slots[slotName];
      if (typeof val !== 'string' || !HEX_COLOR_RE.test(val)) {
        return { ok: false, error: `Custom theme "${t.key}" slot ${slotName} must be a #RRGGBB hex color.` };
      }
      outSlots[slotName] = val;
    }
    out.push({ key: t.key, label: t.label, slots: outSlots as CustomTheme['slots'] });
  }
  return { ok: true, value: out };
}
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
  // Phase 6 Slice B — theme accepts either a known built-in key OR any
  // slug-formatted string (matching the custom theme key constraint).
  // Server only enforces structural shape; the client falls back to the
  // default if the key doesn't resolve to a built-in or current
  // custom_themes entry. Mirrors the shortcut_bindings convention where
  // canonicality lives on the client.
  theme: (v) => {
    if (!isStr(v)) return { ok: false, error: 'theme must be a string.' };
    if (KNOWN_THEMES.includes(v as typeof KNOWN_THEMES[number])) return { ok: true, value: v };
    if (!CUSTOM_THEME_KEY_RE.test(v)) {
      return { ok: false, error: `theme must be a known built-in or a slug (1–32 chars, lowercase a–z 0–9 -).` };
    }
    return { ok: true, value: v };
  },
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
  custom_themes:            validateCustomThemes,
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
