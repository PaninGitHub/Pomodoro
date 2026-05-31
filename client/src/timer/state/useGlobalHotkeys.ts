import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTimer } from './useTimer';
import { useAuth } from '../../auth/useAuth';
import { useSettings } from '../../settings/useSettings';
import { useModalTriggers } from '../../ui/ModalTriggersContext';
import {
  SHORTCUT_ACTIONS,
  buildKeyMap,
  dispatchAction,
  effectiveBindings,
  formatKeyEvent,
  getActionMeta,
  isModifierOnly,
  type ShortcutActionId,
} from './shortcutActions';

// Timer scope = the home/timer view is rendered AND no modal sits on top
// of it. Implemented via two cheap DOM/URL reads inside the handler so
// the effect doesn't have to re-subscribe whenever the user navigates.
function isInTimerScope(): boolean {
  if (window.location.pathname !== '/') return false;
  // role=dialog + aria-modal=true is the project convention for all
  // overlay modals (ModalOverlay, BreakActivityPopup, ReflectionModal,
  // PerModeSettingsPopup, KeyboardShortcutsModal, ClearAllTasksModal,
  // DeleteAccountModal). One selector covers all of them.
  if (document.querySelector('[role="dialog"][aria-modal="true"]')) return false;
  return true;
}

// Global keybinds (Phase 5.5 — bindable).
//
// Reads settings.shortcuts_enabled (master) + settings.shortcut_bindings
// (partial overrides) and merges with defaults from SHORTCUT_ACTIONS.
// Skips when the user is typing in an input/textarea/select/contenteditable
// so 'R' inside a task name field doesn't end the session.
//
// Mounted in AppLayout (always-rendered parent of all routes — lives
// inside RouterProvider so useNavigate works).
export function useGlobalHotkeys(): void {
  const { state, dispatch } = useTimer();
  const { state: authState } = useAuth();
  const { settings } = useSettings();
  const triggers = useModalTriggers();
  const navigate = useNavigate();

  const enabled = settings.shortcuts_enabled;
  const overrides = settings.shortcut_bindings;

  useEffect(() => {
    if (!enabled) return;

    const bindings = effectiveBindings(overrides);
    const keyMap = buildKeyMap(bindings);

    function isTypingTarget(el: EventTarget | null): boolean {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
      if (el.isContentEditable) return true;
      return false;
    }

    function onKey(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return;
      if (isModifierOnly(e)) return;

      const keyString = formatKeyEvent(e);
      const actionId = keyMap.get(keyString) as ShortcutActionId | undefined;
      if (!actionId) return;

      // Scope gate: timer-scoped actions only fire when the user is on
      // the home view and no modal is open. Prevents (e.g.) '2' from
      // switching modes while typing in a Settings input.
      const meta = getActionMeta(actionId);
      if (meta.scope === 'timer' && !isInTimerScope()) return;

      const handled = dispatchAction(actionId, {
        state,
        dispatch,
        authState,
        settings,
        navigate,
        openBreakActivities: () => triggers.setBreakActivitiesOpen(true),
        openModeSettings: () => triggers.setModeSettingsOpen(true),
        openShortcutsHelp: () => triggers.setShortcutsHelpOpen(true),
      });
      if (handled) e.preventDefault();
    }

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [
    enabled,
    overrides,
    state,
    dispatch,
    authState,
    settings,
    triggers,
    navigate,
  ]);
}

// Re-export the registry so KeyboardShortcutsModal can show the merged
// effective bindings without duplicating the merge logic.
export { SHORTCUT_ACTIONS, effectiveBindings };
