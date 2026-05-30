import { useTimer } from '../state/useTimer';
import { useSettings } from '../../settings/useSettings';

export function Controls(): JSX.Element | null {
  const { state, dispatch } = useTimer();
  const { settings } = useSettings();

  function onStartInitial() {
    if (state.mode === 'pomodoro') {
      dispatch({ type: 'START_POMODORO', now: Date.now() });
    } else if (state.mode === 'freestyle') {
      // Per C-09 (mid-fix amendment): target now lives in
      // settings.freestyle_target_minutes (was previously state.totalMs
      // set via the timer-display click-edit, which has been removed).
      const targetMs = state.freestyleTargetEnabled
        ? settings.freestyle_target_minutes * 60_000
        : 0;
      dispatch({ type: 'START_FREESTYLE', now: Date.now(), targetMs });
    } else {
      dispatch({ type: 'START', now: Date.now() });
    }
  }
  function onStartNext()    { dispatch({ type: 'START', now: Date.now() }); }
  function onPause()        { dispatch({ type: 'PAUSE', now: Date.now() }); }
  function onResume()       { dispatch({ type: 'RESUME', now: Date.now() }); }
  function onAbandon()      { dispatch({ type: 'ABANDON' }); }
  function onEndSession()   { dispatch({ type: 'END_SESSION' }); }
  function onEndWork()      { dispatch({ type: 'FREESTYLE_END_WORK', now: Date.now() }); }

  const btn = 'px-6 py-2 rounded border border-border bg-bg-secondary hover:bg-bg-tertiary text-text-primary';
  const primary = 'px-6 py-2 rounded bg-accent text-bg-primary hover:opacity-90 font-semibold';

  // C-09: While Freestyle has a prompt active (target_reached / break_choice),
  // hide the standard controls — the prompt overlay owns the choices.
  if (state.mode === 'freestyle' && state.freestyle && state.freestyle.prompt !== 'none') {
    return null;
  }

  if (state.status === 'idle') {
    return <button type="button" onClick={onStartInitial} className={primary}>Start</button>;
  }

  if (state.status === 'completed') {
    // Pomodoro between periods
    if (state.mode === 'pomodoro' && state.pomodoro) {
      const nextLabel =
        state.pomodoro.periodType === 'work'        ? `Start Work ${state.pomodoro.workCount + 1}`
        : state.pomodoro.periodType === 'short_break' ? 'Start Short Break'
        :                                                'Start Long Break';
      return (
        <div className="flex gap-2 items-center flex-wrap justify-center">
          <button type="button" onClick={onStartNext} className={primary}>{nextLabel}</button>
          <button type="button" onClick={onEndSession} className={btn}>End Session</button>
        </div>
      );
    }
    // Freestyle between periods (after break completed OR Skip Break)
    if (state.mode === 'freestyle' && state.freestyle) {
      return (
        <div className="flex gap-2 items-center flex-wrap justify-center">
          <button type="button" onClick={onStartNext} className={primary}>Start Work</button>
          <button type="button" onClick={onEndSession} className={btn}>End Session</button>
        </div>
      );
    }
    // Timer mode completed
    return <button type="button" onClick={onEndSession} className={primary}>End Session</button>;
  }

  // running / paused state — Freestyle work has an extra "End Work" button.
  const isFreestyleWork =
    state.mode === 'freestyle' &&
    state.freestyle?.periodType === 'work';

  return (
    <div className="flex gap-2 items-center flex-wrap justify-center">
      {state.status === 'running' && (
        <button type="button" onClick={onPause} className={btn}>Pause</button>
      )}
      {state.status === 'paused' && (
        <button type="button" onClick={onResume} className={primary}>Resume</button>
      )}
      {isFreestyleWork && (
        <button type="button" onClick={onEndWork} className={btn}>End Work</button>
      )}
      <button type="button" onClick={onAbandon} className={btn}>Abandon</button>
      <button type="button" onClick={onEndSession} className={btn}>End Session</button>
    </div>
  );
}
