import { useTimer } from '../state/useTimer';
import { formatTime } from '../math/timerMath';

export function TimerDisplay(): JSX.Element {
  const { remainingMs } = useTimer();
  return (
    <div
      className="text-timer text-7xl md:text-9xl font-mono tabular-nums select-none"
      aria-live="polite"
      aria-atomic="true"
    >
      {formatTime(remainingMs)}
    </div>
  );
}
