// Fetches the user's break_logs list. Patterned on useReflectionsList
// but stripped of filters — the F-18 spec is a simple read-only,
// day-grouped view. If filters are added later (?from / ?to), follow the
// reflections hook's buildQueryString + filtersKey pattern.

import { useCallback, useEffect, useState } from 'react';
import type { ClientBreakLog } from './breakTypes';

interface UseBreakLogsListResult {
  break_logs: ClientBreakLog[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useBreakLogsList(): UseBreakLogsListResult {
  const [breakLogs, setBreakLogs] = useState<ClientBreakLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/break-logs', { credentials: 'include' });
      if (res.status !== 200) {
        const msg = `Server responded ${res.status}`;
        // eslint-disable-next-line no-console
        console.warn(`[useBreakLogsList] fetch failed: ${msg}`);
        setError(msg);
        setBreakLogs([]);
        return;
      }
      const body = (await res.json()) as { break_logs: ClientBreakLog[] };
      setBreakLogs(body.break_logs);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown fetch error';
      // eslint-disable-next-line no-console
      console.warn(`[useBreakLogsList] fetch threw: ${msg}`);
      setError(msg);
      setBreakLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Cancellation flag: ignore stale resolutions if the component unmounts
    // mid-fetch (same pattern as useReflectionsList).
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const res = await fetch('/api/break-logs', { credentials: 'include' });
        if (cancelled) return;
        if (res.status !== 200) {
          const msg = `Server responded ${res.status}`;
          // eslint-disable-next-line no-console
          console.warn(`[useBreakLogsList] fetch failed: ${msg}`);
          setError(msg);
          setBreakLogs([]);
          return;
        }
        const body = (await res.json()) as { break_logs: ClientBreakLog[] };
        if (!cancelled) setBreakLogs(body.break_logs);
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : 'Unknown fetch error';
        // eslint-disable-next-line no-console
        console.warn(`[useBreakLogsList] fetch threw: ${msg}`);
        setError(msg);
        setBreakLogs([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { break_logs: breakLogs, loading, error, refetch };
}
