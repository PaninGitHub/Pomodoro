import { useContext } from 'react';
import { BreakActivitiesContext } from './BreakActivitiesContext';

export function useBreakActivities() {
  const ctx = useContext(BreakActivitiesContext);
  if (!ctx) throw new Error('useBreakActivities must be used inside <BreakActivitiesProvider>');
  return ctx;
}
