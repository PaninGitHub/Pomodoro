import { useTimer } from '../state/useTimer';

export function PomodoroSetup(): JSX.Element {
  const { state, dispatch } = useTimer();
  const workMin = Math.round(state.pomodoroWorkMs / 60000);
  const shortMin = Math.round(state.pomodoroShortBreakMs / 60000);
  const longMin = Math.round(state.pomodoroLongBreakMs / 60000);
  const every = state.pomodoroLongBreakEvery;

  return (
    <div className="flex flex-col gap-2 text-sm text-text-secondary">
      <div className="text-xs">
        Work {workMin}m · Short break {shortMin}m · Long break {longMin}m
        {every > 0 ? ` (every ${every} work periods)` : ' (long breaks disabled)'}
        <br />
        <span className="italic">Editable in Settings.</span>
      </div>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={state.autoStartBreaks}
          onChange={(e) => dispatch({ type: 'SET_AUTO_START_BREAKS', value: e.target.checked })}
        />
        Auto Start Breaks
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={state.autoStartPomodoros}
          onChange={(e) => dispatch({ type: 'SET_AUTO_START_POMODOROS', value: e.target.checked })}
        />
        Auto Start Pomodoros
      </label>
    </div>
  );
}
