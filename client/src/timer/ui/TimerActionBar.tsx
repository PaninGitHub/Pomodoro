import { Coffee, Settings as SettingsIcon, Keyboard } from 'lucide-react';
import { useTimer } from '../state/useTimer';
import { Tooltip } from '../../ui/Tooltip';
import { PerModeSettingsPopup } from './PerModeSettingsPopup';
import { KeyboardShortcutsModal } from '../../settings/KeyboardShortcutsModal';
import { BreakActivitiesModal } from '../../breaks/BreakActivitiesModal';
import { useModalTriggers } from '../../ui/ModalTriggersContext';

const iconBtn = 'inline-flex items-center justify-center w-9 h-9 rounded border border-border bg-bg-secondary hover:bg-bg-tertiary text-text-primary';

/**
 * Action bar shown below the timer's Start button — break activities,
 * mode settings, and keyboard shortcuts. All open modals with hover
 * tooltips. Icons are lucide-react SVGs that inherit `currentColor` from
 * the button — themes can restyle by changing the button's color class.
 *
 * Modal open state lives in ModalTriggersContext so global hotkeys can
 * fire opens from outside this component.
 */
export function TimerActionBar(): JSX.Element {
  const { state } = useTimer();
  const triggers = useModalTriggers();

  const modeLabel =
    state.mode === 'timer' ? 'Timer'
    : state.mode === 'pomodoro' ? 'Pomodoro'
    : 'Freestyle';

  return (
    <div className="flex items-center gap-3">
      <Tooltip label="Break activities">
        <button
          type="button"
          onClick={() => triggers.setBreakActivitiesOpen(true)}
          aria-label="Break activities"
          className={iconBtn}
        >
          <Coffee size={18} aria-hidden="true" />
        </button>
      </Tooltip>

      <Tooltip label={`${modeLabel} Settings`}>
        <button
          type="button"
          onClick={() => triggers.setModeSettingsOpen(true)}
          aria-label={`${modeLabel} settings`}
          className={iconBtn}
        >
          <SettingsIcon size={18} aria-hidden="true" />
        </button>
      </Tooltip>

      <Tooltip label="Shortcuts">
        <button
          type="button"
          onClick={() => triggers.setShortcutsHelpOpen(true)}
          aria-label="Keyboard shortcuts"
          className={iconBtn}
        >
          <Keyboard size={18} aria-hidden="true" />
        </button>
      </Tooltip>

      {triggers.isBreakActivitiesOpen && (
        <BreakActivitiesModal onClose={() => triggers.setBreakActivitiesOpen(false)} />
      )}
      {triggers.isModeSettingsOpen && (
        <PerModeSettingsPopup onClose={() => triggers.setModeSettingsOpen(false)} />
      )}
      {triggers.isShortcutsHelpOpen && (
        <KeyboardShortcutsModal onClose={() => triggers.setShortcutsHelpOpen(false)} />
      )}
    </div>
  );
}
