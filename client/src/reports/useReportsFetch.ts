import { useCallback, useEffect, useMemo, useState } from 'react';

// Shared fetch core for the three Reports endpoints (Phase 5 refactor).
//
// Each consumer (useStreak / useFocusReport / useTimeReport) was a near-
// identical ~80 lines of fetch+cancel+state boilerplate that diverged only
// in URL shape and response type. Consolidating here:
//   - One cancellation guard
//   - One loading/error/data state machine
//   - One refetch callback
//   - One place to evolve all three (e.g. add retries, telemetry, auth-401
//     handling) without touching three call sites.
//
// Consumers stay thin: build the URL with their own params, pass it in,
// return the result unchanged.

export interface ReportsFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Browser IANA tz — captured once per hook instance and stable across
// re-renders. The server defaults to UTC when omitted, which would
// corrupt day-bucket boundaries for users far from UTC.
export function useBrowserTz(): string {
  return useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);
}

export function useReportsFetch<T>(url: string, label: string): ReportsFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Manual fetch (Retry button after a failure). Reads the closure URL,
  // so it always uses the most recent value the caller passed in.
  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url, { credentials: 'include' });
      if (res.status !== 200) {
        const msg = `Server responded ${res.status}`;
        // eslint-disable-next-line no-console
        console.warn(`[${label}] fetch failed: ${msg}`);
        setError(msg);
        setData(null);
        return;
      }
      setData((await res.json()) as T);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown fetch error';
      // eslint-disable-next-line no-console
      console.warn(`[${label}] fetch threw: ${msg}`);
      setError(msg);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [url, label]);

  // Auto-fetch on URL change. Cancellation flag prevents a slow stale
  // fetch from clobbering a faster newer one (e.g. user toggles
  // daily→weekly→daily quickly).
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const res = await fetch(url, { credentials: 'include' });
        if (cancelled) return;
        if (res.status !== 200) {
          const msg = `Server responded ${res.status}`;
          // eslint-disable-next-line no-console
          console.warn(`[${label}] fetch failed: ${msg}`);
          setError(msg);
          setData(null);
          return;
        }
        const body = (await res.json()) as T;
        if (!cancelled) setData(body);
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : 'Unknown fetch error';
        // eslint-disable-next-line no-console
        console.warn(`[${label}] fetch threw: ${msg}`);
        setError(msg);
        setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [url, label]);

  return { data, loading, error, refetch };
}
