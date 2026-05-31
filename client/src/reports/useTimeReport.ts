import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReportBucket, TimeReportResponse } from './reportsTypes';

interface UseTimeReportArgs {
  bucket: ReportBucket;
}

interface UseTimeReportResult {
  data: TimeReportResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// F-28 Metric 3 fetcher. Parallel to useFocusReport — separate hook so
// the page can render either independently (cards show their own loading
// / error / empty states).
export function useTimeReport({ bucket }: UseTimeReportArgs): UseTimeReportResult {
  const [data, setData] = useState<TimeReportResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const tz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);
  const url = `/api/reports/time?bucket=${bucket}&tz=${encodeURIComponent(tz)}`;

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url, { credentials: 'include' });
      if (res.status !== 200) {
        const msg = `Server responded ${res.status}`;
        // eslint-disable-next-line no-console
        console.warn(`[useTimeReport] fetch failed: ${msg}`);
        setError(msg);
        setData(null);
        return;
      }
      const body = (await res.json()) as TimeReportResponse;
      setData(body);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown fetch error';
      // eslint-disable-next-line no-console
      console.warn(`[useTimeReport] fetch threw: ${msg}`);
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
          console.warn(`[useTimeReport] fetch failed: ${msg}`);
          setError(msg);
          setData(null);
          return;
        }
        const body = (await res.json()) as TimeReportResponse;
        if (!cancelled) setData(body);
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : 'Unknown fetch error';
        // eslint-disable-next-line no-console
        console.warn(`[useTimeReport] fetch threw: ${msg}`);
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
