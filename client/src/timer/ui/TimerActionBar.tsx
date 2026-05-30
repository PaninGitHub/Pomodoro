import { useState } from 'react';
import { useTimer } from '../state/useTimer';
import { Tooltip } from '../../ui/Tooltip';
import { PerModeSettingsPopup } from './PerModeSettingsPopup';
import { KeyboardShortcutsModal } from '../../settings/KeyboardShortcutsModal';

const iconBtn = 'inline-flex items-center justify-center w-9 h-9 rounded border border-border bg-bg-secondary hover:bg-bg-tertiary text-text-primary';

/**
 * Action bar shown below the timer's Start button — settings (mode-aware)
 * and keyboard shortcuts. Both with hover tooltips.
 */
export function TimerActionBar(): JSX.Element {
  const { state } = useTimer();
  const [showSettings, setShowSettings] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const modeLabel =
    state.mode === 'timer' ? 'Timer'
    : state.mode === 'pomodoro' ? 'Pomodoro'
    : 'Freestyle';

  return (
    <div className="flex items-center gap-3">
      <Tooltip label={`${modeLabel} Settings`}>
        <button
          type="button"
          onClick={() => setShowSettings(true)}
          aria-label={`${modeLabel} settings`}
          className={iconBtn}
        >
          ⚙
        </button>
      </Tooltip>

      <Tooltip label="Shortcuts">
        <button
          type="button"
          onClick={() => setShowShortcuts(true)}
          aria-label="Keyboard shortcuts"
          className={iconBtn}
        >
          ⌨
        </button>
      </Tooltip>

      {showSettings && <PerModeSettingsPopup onClose={() => setShowSettings(false)} />}
      {showShortcuts && <KeyboardShortcutsModal onClose={() => setShowShortcuts(false)} />}
    </div>
  );
}
