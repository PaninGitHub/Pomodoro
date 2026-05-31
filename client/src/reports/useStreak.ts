import { useCallback, useEffect, useMemo, useState } from 'react';
import type { StreakResponse } from './reportsTypes';

interface UseStreakResult {
  data: StreakResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// F-28 Metric 1 fetcher. Sends the browser's IANA tz so day-bucket
// boundaries align with the user's local clock (server falls back to UTC
// if omitted, which would corrupt the count for users far from UTC).
export function useStreak(): UseStreakResult {
  const [data, setData] = useState<StreakResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const tz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);
  const url = `/api/reports/streak?tz=${encodeURIComponent(tz)}`;

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url, { credentials: 'include' });
      if (res.status !== 200) {
        const msg = `Server responded ${res.status}`;
        // eslint-disable-next-line no-console
        console.warn(`[useStreak] fetch failed: ${msg}`);
        setError(msg);
        setData(null);
        return;
      }
      const body = (await res.json()) as StreakResponse;
      setData(body);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown fetch error';
      // eslint-disable-next-line no-console
      console.warn(`[useStreak] fetch threw: ${msg}`);
      setError(msg);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [url]);

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
          console.warn(`[useStreak] fetch failed: ${msg}`);
          setError(msg);
          setData(null);
          return;
        }
        const body = (await res.json()) as StreakResponse;
        if (!cancelled) setData(body);
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : 'Unknown fetch error';
        // eslint-disable-next-line no-console
        console.warn(`[useStreak] fetch threw: ${msg}`);
        setError(msg);
        setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [url]);

  return { data, loading, error, refetch };
}
