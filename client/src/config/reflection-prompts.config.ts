// SINGLE SOURCE OF TRUTH for reflection prompt keys + default text.
// Server has a parallel file at server/config/reflectionPrompts.ts —
// keys MUST stay in sync. If you add a new prompt:
//   1. Add the key here
//   2. Add the same key + default text to server/config/reflectionPrompts.ts
//   3. The migration 008 back-fill INSERT picks it up via the seed loop

export type PerPeriodPromptKey =
  | 'did_well'
  | 'do_better'
  | 'hindrance_options'
  | 'hindrance_detail'
  | 'task_structure_note';

export type SessionPromptKey =
  | 'accomplishment'
  | 'obstacle'
  | 'do_differently';

export type PromptKey = PerPeriodPromptKey | SessionPromptKey;

export const PER_PERIOD_KEYS: readonly PerPeriodPromptKey[] = [
  'did_well', 'do_better', 'hindrance_options', 'hindrance_detail', 'task_structure_note',
] as const;

export const SESSION_KEYS: readonly SessionPromptKey[] = [
  'accomplishment', 'obstacle', 'do_differently',
] as const;

export const ALL_PROMPT_KEYS: readonly PromptKey[] = [...PER_PERIOD_KEYS, ...SESSION_KEYS] as const;

export const DEFAULT_PROMPTS: Record<PromptKey, string> = {
  did_well:            'What did you do well?',
  do_better:           'What can you do better?',
  hindrance_options:   'What hindered your focus?',
  hindrance_detail:    'What specifically caused it / how to avoid it?',
  task_structure_note: 'How can you structure your tasks better?',
  accomplishment:      'What was your biggest accomplishment today?',
  obstacle:            'What was your biggest obstacle today?',
  do_differently:      'What will you do differently next session?',
};

export const HINDRANCE_OPTIONS = ['Distractions', 'Unclear Tasks', 'Environment'] as const;
export type HindranceOption = typeof HINDRANCE_OPTIONS[number];

// Field-level character caps (per Batch B F-07 + F-08).
export const FREE_TEXT_MAX = 500;
export const PROMPT_TEXT_MAX = 1280;
