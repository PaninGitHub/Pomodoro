// Phase 5.5 — central registry for bindable global keyboard shortcuts.
//
// One source of truth for both:
//   - useGlobalHotkeys (the runtime dispatcher)
//   - ShortcutsSettings (the bindable UI)
//   - KeyboardShortcutsModal (the help dialog)
//
// Adding a new action = add an entry to SHORTCUT_ACTIONS + a case in
// dispatchAction. The Settings UI auto-renders it.

import type { TimerAction, TimerState } from './timerReducer';
import type { AuthState } from '../../auth/AuthContext';
import type { Settings } from '../../settings/settingsTypes';
import { links } from '../../routes';

export type ShortcutActionId =
  | 'toggle_timer'
  | 'end_session'
  | 'skip_period'
  | 'mode_timer'
  | 'mode_pomodoro'
  | 'mode_freestyle'
  | 'go_home'
  | 'go_settings'
  | 'go_logs_reports'
  | 'go_logs_reflections'
  | 'go_logs_break'
  | 'open_break_activities'
  | 'open_mode_settings'
  | 'open_shortcuts_help';

export type ShortcutCategory = 'Timer' | 'Navigation' | 'Modals';

// scope === 'timer' = fires only when the user is on the home/timer page
// AND no modal is currently mounted in the DOM. Prevents (for example) "2"
// from switching to Pomodoro while the user is on /settings or has the
// Logs modal open.
// scope === 'anywhere' = fires on any route, regardless of open modals.
export type ShortcutScope = 'timer' | 'anywhere';

export interface ShortcutActionMeta {
  id: ShortcutActionId;
  label: string;
  defaultKey: string;          // canonical key string (see formatKeyEvent)
  category: ShortcutCategory;
  scope: ShortcutScope;
}

export const SHORTCUT_ACTIONS: readonly ShortcutActionMeta[] = [
  { id: 'toggle_timer',         label: 'Start / Pause / Resume timer', defaultKey: 'Space', category: 'Timer',      scope: 'timer' },
  { id: 'end_session',          label: 'End session',                  defaultKey: 'R',     category: 'Timer',      scope: 'timer' },
  { id: 'skip_period',          label: 'Skip to next period',          defaultKey: 'N',     category: 'Timer',      scope: 'timer' },
  { id: 'mode_timer',           label: 'Switch to Timer mode',         defaultKey: '1',     category: 'Timer',      scope: 'timer' },
  { id: 'mode_pomodoro',        label: 'Switch to Pomodoro mode',      defaultKey: '2',     category: 'Timer',      scope: 'timer' },
  { id: 'mode_freestyle',       label: 'Switch to Freestyle mode',     defaultKey: '3',     category: 'Timer',      scope: 'timer' },

  { id: 'go_home',              label: 'Go to Home',                   defaultKey: 'G',     category: 'Navigation', scope: 'anywhere' },
  { id: 'go_settings',          label: 'Open Settings',                defaultKey: 'S',     category: 'Navigation', scope: 'anywhere' },
  { id: 'go_logs_reports',      label: 'Open Logs — Reports',          defaultKey: 'T',     category: 'Navigation', scope: 'anywhere' },
  { id: 'go_logs_reflections',  label: 'Open Logs — Reflections',      defaultKey: 'F',     category: 'Navigation', scope: 'anywhere' },
  { id: 'go_logs_break',        label: 'Open Logs — Break log',        defaultKey: 'L',     category: 'Navigation', scope: 'anywhere' },

  { id: 'open_break_activities', label: 'Open Break Activities',       defaultKey: 'B',     category: 'Modals',     scope: 'timer' },
  { id: 'open_mode_settings',    label: 'Open Mode Settings',          defaultKey: 'M',     category: 'Modals',     scope: 'timer' },
  { id: 'open_shortcuts_help',   label: 'Open Shortcuts help',         defaultKey: '?',     category: 'Modals',     scope: 'anywhere' },
] as const;

const ACTION_INDEX: Record<string, ShortcutActionMeta> = Object.fromEntries(
  SHORTCUT_ACTIONS.map((a) => [a.id, a]),
);

export function isShortcutActionId(id: string): id is ShortcutActionId {
  return id in ACTION_INDEX;
}

export function getActionMeta(id: ShortcutActionId): ShortcutActionMeta {
  // ACTION_INDEX is built from SHORTCUT_ACTIONS — every ShortcutActionId
  // resolves. The Record<string,_> type just doesn't carry that guarantee.
  return ACTION_INDEX[id]!;
}

// =============================================================================
// Key string canonicalization
//
// Canonical key strings are case-stable, modifier-prefixed, and identical
// regardless of how the user originally typed the binding. Used for both
// storage and runtime matching.
//
//   Letters:   uppercase  ('R' not 'r')
//   Digits:    as-is      ('1')
//   Symbols:   as-is      ('?', '/', '[')
//   Special:   PascalCase ('Space', 'Enter', 'Backspace', 'ArrowLeft')
//   Modifiers: Ctrl+ → Cmd+ → Alt+ → Shift+ → key  (fixed order)
//
// Examples: "Space", "R", "Ctrl+R", "Ctrl+Shift+K", "Shift+?", "ArrowLeft"

const KEY_NAME_OVERRIDES: Record<string, string> = {
  ' ': 'Space',
  Spacebar: 'Space',
};

export function formatKeyEvent(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.ctrlKey) parts.push('Ctrl');
  if (e.metaKey) parts.push('Cmd');
  if (e.altKey) parts.push('Alt');
  // Shift is implicit for any single-character key — the character itself
  // already encodes the shift state:
  //   Shift + / → '?'    (Shift+? would be unreachable / redundant)
  //   Shift + r → 'R'    (same shortcut as just 'R' or Caps Lock + r)
  //   Shift + 1 → '!'    (binds as '!' rather than 'Shift+1')
  // Multi-char keys (Space, Enter, ArrowLeft, F1, …) keep Shift since the
  // physical key produces the same .key with or without shift held.
  if (e.shiftKey && e.key.length > 1) parts.push('Shift');

  let key = KEY_NAME_OVERRIDES[e.key] ?? e.key;
  if (key.length === 1 && /[a-z]/i.test(key)) key = key.toUpperCase();
  parts.push(key);
  return parts.join('+');
}

// True if the keydown event was just a modifier press (no actual key).
// Lets capture-mode UI ignore "user is holding Shift to type Shift+?"
// transitional events.
export function isModifierOnly(e: KeyboardEvent): boolean {
  return e.key === 'Control' || e.key === 'Meta' || e.key === 'Alt' || e.key === 'Shift';
}

// =============================================================================
// Effective bindings — merge user overrides with built-in defaults.

export function effectiveBindings(
  overrides: Record<string, string | null> | null,
): Map<ShortcutActionId, string | null> {
  const out = new Map<ShortcutActionId, string | null>();
  for (const a of SHORTCUT_ACTIONS) {
    if (overrides && a.id in overrides) {
      out.set(a.id, overrides[a.id] ?? null);
    } else {
      out.set(a.id, a.defaultKey);
    }
  }
  return out;
}

// Reverse map: keyString → actionId. Skips null-bound (disabled) actions.
// If duplicates exist (only possible from server-side corruption since the
// Settings UI blocks them), last-wins — registry order decides priority.
export function buildKeyMap(
  bindings: Map<ShortcutActionId, string | null>,
): Map<string, ShortcutActionId> {
  const out = new Map<string, ShortcutActionId>();
  for (const [actionId, key] of bindings) {
    if (key !== null) out.set(key, actionId);
  }
  return out;
}

// =============================================================================
// Action dispatch — fan out to TimerContext / Router / state-driven modals.

export interface DispatchDeps {
  state: TimerState;
  dispatch: (a: TimerAction) => void;
  authState: AuthState;
  settings: Settings;
  navigate: (to: string) => void;
  openBreakActivities: () => void;
  openModeSettings: () => void;
  openShortcutsHelp: () => void;
}

export function dispatchAction(actionId: ShortcutActionId, deps: DispatchDeps): boolean {
  const now = Date.now();
  const { state, dispatch, authState, settings, navigate } = deps;

  switch (actionId) {
    case 'toggle_timer': {
      if (state.status === 'running') dispatch({ type: 'PAUSE', now });
      else if (state.status === 'paused') dispatch({ type: 'RESUME', now });
      else if (state.status === 'idle' && state.currentSessionId === null) {
        if (state.mode === 'pomodoro') dispatch({ type: 'START_POMODORO', now });
        else if (state.mode === 'freestyle') {
          const targetMs = settings.freestyle_target_minutes * 60_000;
          dispatch({ type: 'START_FREESTYLE', now, targetMs });
        } else dispatch({ type: 'START', now });
      } else dispatch({ type: 'START', now });
      return true;
    }
    case 'end_session':
      if (state.currentSessionId === null) return false;
      dispatch({ type: 'END_SESSION' });
      return true;
    case 'skip_period':
      if (state.status !== 'running' && state.status !== 'paused') return false;
      dispatch({ type: 'PERIOD_COMPLETE', now });
      return true;

    case 'mode_timer':
      if (state.currentSessionId !== null) return false;
      dispatch({ type: 'SELECT_MODE', mode: 'timer' });
      return true;
    case 'mode_pomodoro':
      if (state.currentSessionId !== null) return false;
      dispatch({ type: 'SELECT_MODE', mode: 'pomodoro' });
      return true;
    case 'mode_freestyle':
      if (state.currentSessionId !== null) return false;
      dispatch({ type: 'SELECT_MODE', mode: 'freestyle' });
      return true;

    case 'go_home':              navigate(links.home()); return true;
    case 'go_settings':          navigate(links.settings()); return true;
    case 'go_logs_reports':
      if (authState.kind !== 'signed_in') return false;
      navigate(links.logs('reports')); return true;
    case 'go_logs_reflections':
      if (authState.kind !== 'signed_in') return false;
      navigate(links.logs('reflections')); return true;
    case 'go_logs_break':
      if (authState.kind !== 'signed_in') return false;
      navigate(links.logs('break')); return true;

    case 'open_break_activities': deps.openBreakActivities(); return true;
    case 'open_mode_settings':    deps.openModeSettings(); return true;
    case 'open_shortcuts_help':   deps.openShortcutsHelp(); return true;
  }
}
