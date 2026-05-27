import { useEffect } from 'react';
import { useTimer } from '../timer/state/useTimer';
import { TimerDisplay } from '../timer/ui/TimerDisplay';
import { ModeSelector } from '../timer/ui/ModeSelector';
import { Controls } from '../timer/ui/Controls';
import { DurationInput } from '../timer/ui/DurationInput';
import { FreestyleSetup } from '../timer/ui/FreestyleSetup';
import { PomodoroSetup } from '../timer/ui/PomodoroSetup';
import { PeriodIndicator } from '../timer/ui/PeriodIndicator';
import { CustomizableAdjustButton } from '../timer/ui/CustomizableAdjustButton';
import { TwoTabBanner } from '../timer/ui/TwoTabBanner';
import { useVisibilityChange } from '../timer/hooks/useVisibilityChange';
import { useBroadcastChannel } from '../timer/hooks/useBroadcastChannel';
import { isPeriodOverCap, PERIOD_CAP_MESSAGE } from '../timer/math/periodCap';
import { playAlarm } from '../audio/playAlarm';
import { TodoList } from '../tasks/TodoList';

// TODO(phase-2): pull volume + repeats from settings.
const ALARM_VOLUME = 80;
const ALARM_REPEATS = 1;

export function TimerArea(): JSX.Element {
  const { state, dispatch, remainingMs } = useTimer();
  useVisibilityChange(() => { /* tick effect in TimerContext handles recompute */ });
  const { otherTabRunning } = useBroadcastChannel({ isRunning: state.status === 'running' });

  // Period end detection: when remaining hits 0 while running, fire alarm + completion.
  // The reducer's PERIOD_COMPLETE already prepares the next Pomodoro period (if any),
  // so this effect doesn't need to know about cycling.
  useEffect(() => {
    if (state.status === 'running' && remainingMs === 0) {
      void playAlarm({ volume: ALARM_VOLUME, repeats: ALARM_REPEATS });
      dispatch({ type: 'PERIOD_COMPLETE', now: Date.now() });
    }
  }, [state.status, remainingMs, dispatch]);

  // 12-hour per-period cap (client-side enforcement per F-32 / C-07).
  useEffect(() => {
    if (state.status !== 'running') return;
    const elapsed = state.accumulatedMs + (Date.now() - state.startTimestamp);
    if (isPeriodOverCap(elapsed)) {
      alert(PERIOD_CAP_MESSAGE); // TODO(phase-2): replace with a proper modal.
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
      // Idle: SET_DURATION (replaces totalMs absolutely). Use minutes API.
      const currentMinutes = state.totalMs / 60000;
      const next = Math.max(0.0167, currentMinutes + deltaMinutes); // floor at 1 second
      dispatch({ type: 'SET_DURATION', minutes: next });
    } else if (state.status === 'running' || state.status === 'paused') {
      // Mid-session: ADJUST_TOTAL preserves elapsed time, only nudges length.
      dispatch({ type: 'ADJUST_TOTAL', deltaMs });
    }
  }

  // Setup UI is shown when idle (mode-selection screen).
  const showSetup = state.status === 'idle';
  // Mid-session adjust button is visible whenever a period is active in ANY
  // mode (per user feedback in Phase 1 — replaces the idle-only Freestyle
  // placement which was redundant with FreestyleSetup's duration input).
  const showAdjust = state.status === 'running' || state.status === 'paused';

  return (
    <div className="w-full flex flex-col items-center gap-6 p-4 md:p-8">
      <TwoTabBanner visible={otherTabRunning && state.status === 'running'} />
      <PeriodIndicator />
      <TimerDisplay />
      {showSetup && state.mode === 'timer'     && <DurationInput />}
      {showSetup && state.mode === 'freestyle' && <FreestyleSetup />}
      {showSetup && state.mode === 'pomodoro'  && <PomodoroSetup />}
      {showAdjust && <CustomizableAdjustButton onAdjust={adjustDuration} />}
      <Controls />
      {state.status === 'idle' && <ModeSelector />}
      <TodoList />
    </div>
  );
}
