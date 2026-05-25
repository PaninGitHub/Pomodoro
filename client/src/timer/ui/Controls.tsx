import { useTimer } from '../state/useTimer';

export function Controls(): JSX.Element {
  const { state, dispatch } = useTimer();

  function onStartInitial() {
    // Pomodoro idle → START_POMODORO (initializes pomodoro state to work/period 1).
    // Timer / Freestyle idle → plain START.
    if (state.mode === 'pomodoro') {
      dispatch({ type: 'START_POMODORO', now: Date.now() });
    } else {
      dispatch({ type: 'START', now: Date.now() });
    }
  }
  function onStartNext()    { dispatch({ type: 'START', now: Date.now() }); }
  function onPause()        { dispatch({ type: 'PAUSE', now: Date.now() }); }
  function onResume()       { dispatch({ type: 'RESUME', now: Date.now() }); }
  function onAbandon()      { dispatch({ type: 'ABANDON' }); }
  function onEndSession()   { dispatch({ type: 'END_SESSION' }); }

  const btn = 'px-6 py-2 rounded border border-border bg-bg-secondary hover:bg-bg-tertiary text-text-primary';
  const primary = 'px-6 py-2 rounded bg-accent text-bg-primary hover:opacity-90 font-semibold';

  if (state.status === 'idle') {
    return <button type="button" onClick={onStartInitial} className={primary}>Start</button>;
  }

  if (state.status === 'completed') {
    // Pomodoro between periods: the reducer has already prepared the upcoming
    // period type via PERIOD_COMPLETE. Offer a labeled Start for it.
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
    // Timer / Freestyle completed: session-end-only.
    return <button type="button" onClick={onEndSession} className={primary}>End Session</button>;
  }

  return (
    <div className="flex gap-2 items-center flex-wrap justify-center">
      {state.status === 'running' && (
        <button type="button" onClick={onPause} className={btn}>Pause</button>
      )}
      {state.status === 'paused' && (
        <button type="button" onClick={onResume} className={primary}>Resume</button>
      )}
      <button type="button" onClick={onAbandon} className={btn}>Abandon</button>
      <button type="button" onClick={onEndSession} className={btn}>End Session</button>
    </div>
  );
}
