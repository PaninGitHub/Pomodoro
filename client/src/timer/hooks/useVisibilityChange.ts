import { useEffect } from 'react';

export function useVisibilityChange(onVisible: () => void): void {
  useEffect(() => {
    function handler() {
      if (document.visibilityState === 'visible') onVisible();
    }
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [onVisible]);
}
