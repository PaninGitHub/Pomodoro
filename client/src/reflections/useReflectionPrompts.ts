import { useContext } from 'react';
import { ReflectionContext } from './ReflectionContext';

export function useReflectionPrompts() {
  const ctx = useContext(ReflectionContext);
  if (!ctx) throw new Error('useReflectionPrompts must be used inside <ReflectionPromptsProvider>');
  return ctx;
}
