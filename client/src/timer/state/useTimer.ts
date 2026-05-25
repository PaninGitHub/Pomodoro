import { useContext } from 'react';
import { TimerContext } from './TimerContext';

export function useTimer() {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error('useTimer must be used inside <TimerProvider>');
  return ctx;
}
