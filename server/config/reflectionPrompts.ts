// Mirror of client/src/config/reflection-prompts.config.ts. Keep in
// sync (see header comment in the client file).

export type PromptKey =
  | 'did_well' | 'do_better' | 'hindrance_options' | 'hindrance_detail' | 'task_structure_note'
  | 'accomplishment' | 'obstacle' | 'do_differently';

export const ALL_PROMPT_KEYS: readonly PromptKey[] = [
  'did_well', 'do_better', 'hindrance_options', 'hindrance_detail', 'task_structure_note',
  'accomplishment', 'obstacle', 'do_differently',
] as const;

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

export const FREE_TEXT_MAX = 500;
export const PROMPT_TEXT_MAX = 1280;
