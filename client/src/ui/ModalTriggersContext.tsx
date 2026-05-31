import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

// Lightweight context for state-driven modals that need to be triggered
// from outside their normal mount point (e.g. global keyboard shortcuts
// firing from useGlobalHotkeys in AppLayout, but the modal renders inside
// TimerActionBar). Two consumers per modal:
//   - TimerActionBar reads `isXOpen` to decide render and `setXOpen(false)`
//     for the close handler.
//   - useGlobalHotkeys calls `setXOpen(true)` to fire.
//
// Could go via custom DOM events but a typed context is cheaper to
// refactor and the type errors guide the wiring.

export interface ModalTriggersValue {
  isBreakActivitiesOpen: boolean;
  setBreakActivitiesOpen: (open: boolean) => void;
  isModeSettingsOpen: boolean;
  setModeSettingsOpen: (open: boolean) => void;
  isShortcutsHelpOpen: boolean;
  setShortcutsHelpOpen: (open: boolean) => void;
}

const ModalTriggersContext = createContext<ModalTriggersValue | null>(null);

export function ModalTriggersProvider({ children }: { children: ReactNode }): JSX.Element {
  const [breakActivities, setBA] = useState(false);
  const [modeSettings, setMS] = useState(false);
  const [shortcutsHelp, setSH] = useState(false);

  const value = useMemo<ModalTriggersValue>(() => ({
    isBreakActivitiesOpen: breakActivities,
    setBreakActivitiesOpen: setBA,
    isModeSettingsOpen: modeSettings,
    setModeSettingsOpen: setMS,
    isShortcutsHelpOpen: shortcutsHelp,
    setShortcutsHelpOpen: setSH,
  }), [breakActivities, modeSettings, shortcutsHelp]);

  return <ModalTriggersContext.Provider value={value}>{children}</ModalTriggersContext.Provider>;
}

export function useModalTriggers(): ModalTriggersValue {
  const v = useContext(ModalTriggersContext);
  if (!v) throw new Error('useModalTriggers must be used inside <ModalTriggersProvider>');
  return v;
}
