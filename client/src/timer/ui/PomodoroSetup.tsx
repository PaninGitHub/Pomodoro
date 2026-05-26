import { useTimer } from '../state/useTimer';
import { POMODORO_DEFAULTS } from '../state/timerReducer';

export function PomodoroSetup(): JSX.Element {
  const { state, dispatch } = useTimer();

  return (
    <div className="flex flex-col gap-2 text-sm text-text-secondary">
      <div className="text-xs">
        Defaults: Work {POMODORO_DEFAULTS.workMinutes}m · Short break{' '}
        {POMODORO_DEFAULTS.shortBreakMinutes}m · Long break{' '}
        {POMODORO_DEFAULTS.longBreakMinutes}m (every {POMODORO_DEFAULTS.longBreakEvery} work periods)
        <br />
        <span className="italic">Editable in Phase 2's Settings page.</span>
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
