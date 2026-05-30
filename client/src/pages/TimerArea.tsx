import { useEffect } from 'react';
import { useTimer } from '../timer/state/useTimer';
import { TimerDisplay } from '../timer/ui/TimerDisplay';
import { ModeTabs } from '../timer/ui/ModeTabs';
import { Controls } from '../timer/ui/Controls';
import { PeriodIndicator } from '../timer/ui/PeriodIndicator';
import { CustomizableAdjustButton } from '../timer/ui/CustomizableAdjustButton';
import { TwoTabBanner } from '../timer/ui/TwoTabBanner';
import { TimerActionBar } from '../timer/ui/TimerActionBar';
import { FreestylePromptOverlay } from '../timer/ui/FreestylePromptOverlay';
import { useVisibilityChange } from '../timer/hooks/useVisibilityChange';
import { useBroadcastChannel } from '../timer/hooks/useBroadcastChannel';
import { isPeriodOverCap, PERIOD_CAP_MESSAGE } from '../timer/math/periodCap';
import { playAlarm } from '../audio/playAlarm';
import { TodoList } from '../tasks/TodoList';
import { useSettings } from '../settings/useSettings';
import { useTasks } from '../tasks/useTasks';

export function TimerArea(): JSX.Element {
  const { state, dispatch, remainingMs } = useTimer();
  const { settings } = useSettings();
  const { tasks } = useTasks();
  useVisibilityChange(() => { /* tick effect in TimerContext handles recompute */ });
  const { otherTabRunning } = useBroadcastChannel({ isRunning: state.status === 'running' });

  // Period end / target hit detection.
  useEffect(() => {
    if (state.status !== 'running') return;

    // --- Freestyle work: target-hit detection (C-09) ---
    if (
      state.mode === 'freestyle' &&
      state.freestyle?.periodType === 'work' &&
      state.freestyle.targetMs > 0 &&
      !state.freestyle.targetReached &&
      state.freestyle.prompt === 'none'
    ) {
      const elapsed = state.accumulatedMs + (Date.now() - state.startTimestamp);
      if (elapsed >= state.freestyle.targetMs) {
        void playAlarm({
          volume: settings.alarm_volume,
          repeats: settings.alarm_repeats,
          fireNotification: settings.browser_notifications,
        });
        dispatch({ type: 'FREESTYLE_TARGET_HIT', now: Date.now() });
        return;
      }
    }

    // --- Countdown completion (Timer / Pomodoro / Freestyle break) ---
    const isFreestyleWork =
      state.mode === 'freestyle' && state.freestyle?.periodType === 'work';
    if (!isFreestyleWork && remainingMs === 0) {
      void playAlarm({
        volume: settings.alarm_volume,
        repeats: settings.alarm_repeats,
        fireNotification: settings.browser_notifications,
      });
      // C-06 predicate
      const justFinishedWork =
        state.mode === 'pomodoro' && state.pomodoro?.periodType === 'work';
      const allTasksComplete = tasks.length > 0 && tasks.every((t) => t.is_complete);
      if (justFinishedWork && allTasksComplete) {
        dispatch({ type: 'END_SESSION' });
      } else {
        dispatch({ type: 'PERIOD_COMPLETE', now: Date.now() });
      }
    }
  }, [
    state,
    remainingMs,
    dispatch,
    settings.alarm_volume,
    settings.alarm_repeats,
    settings.browser_notifications,
    tasks,
  ]);

  // 12-hour per-period cap (client-side enforcement per F-32 / C-07).
  useEffect(() => {
    if (state.status !== 'running') return;
    const elapsed = state.accumulatedMs + (Date.now() - state.startTimestamp);
    if (isPeriodOverCap(elapsed)) {
      alert(PERIOD_CAP_MESSAGE);
      dispatch({ type: 'PERIOD_COMPLETE', now: Date.now() });
    }
  }, [state, dispatch]);

  // Pomodoro auto-start: after PERIOD_COMPLETE prepares the next period,
  // start it automatically if the matching toggle is on.
  useEffect(() => {
    if (state.mode !== 'pomodoro') return;
    if (state.status !== 'completed') return;
    if (!state.pomodoro) return;
    const nextIsBreak = state.pomodoro.periodType !== 'work';
    const shouldAutoStart = nextIsBreak ? state.autoStartBreaks : state.autoStartPomodoros;
    if (shouldAutoStart) {
      dispatch({ type: 'START', now: Date.now() });
    }
  }, [
    state.mode,
    state.status,
    state.pomodoro,
    state.autoStartBreaks,
    state.autoStartPomodoros,
    dispatch,
  ]);

  function adjustDuration(deltaMinutes: number) {
    const deltaMs = deltaMinutes * 60 * 1000;
    if (state.status === 'idle') {
      const currentMinutes = state.totalMs / 60000;
      const next = Math.max(0.0167, currentMinutes + deltaMinutes);
      dispatch({ type: 'SET_DURATION', minutes: next });
    } else if (state.status === 'running' || state.status === 'paused') {
      dispatch({ type: 'ADJUST_TOTAL', deltaMs });
    }
  }

  const showAdjust = state.status === 'running' || state.status === 'paused';

  return (
    <div className="w-full flex flex-col items-center gap-6 p-4 md:p-8">
      <TwoTabBanner visible={otherTabRunning && state.status === 'running'} />
      <ModeTabs />
      <PeriodIndicator />
      <TimerDisplay />
      {/* Per-mode setup components removed — duration is now click-to-edit on the
          display, and other mode-specific settings live in PerModeSettingsPopup
          opened from the gear icon in TimerActionBar. */}
      {showAdjust && <CustomizableAdjustButton onAdjust={adjustDuration} step={settings.timer_adjust_step_minutes} />}
      <Controls />
      <FreestylePromptOverlay />
      <TimerActionBar />
      <TodoList />
    </div>
  );
}
