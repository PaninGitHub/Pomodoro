import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FocusReportResponse, ReportBucket } from './reportsTypes';

interface UseFocusReportArgs {
  bucket: ReportBucket;
}

interface UseFocusReportResult {
  data: FocusReportResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// F-28 Metric 2 fetcher. The bucket changes when the user toggles
// daily/weekly on the page; cancellation flag prevents a slow stale fetch
// from clobbering a faster newer one.
export function useFocusReport({ bucket }: UseFocusReportArgs): UseFocusReportResult {
  const [data, setData] = useState<FocusReportResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const tz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);
  const url = `/api/reports/focus?bucket=${bucket}&tz=${encodeURIComponent(tz)}`;

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url, { credentials: 'include' });
      if (res.status !== 200) {
        const msg = `Server responded ${res.status}`;
        // eslint-disable-next-line no-console
        console.warn(`[useFocusReport] fetch failed: ${msg}`);
        setError(msg);
        setData(null);
        return;
      }
      const body = (await res.json()) as FocusReportResponse;
      setData(body);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown fetch error';
      // eslint-disable-next-line no-console
      console.warn(`[useFocusReport] fetch threw: ${msg}`);
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
          console.warn(`[useFocusReport] fetch failed: ${msg}`);
          setError(msg);
          setData(null);
          return;
        }
        const body = (await res.json()) as FocusReportResponse;
        if (!cancelled) setData(body);
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : 'Unknown fetch error';
        // eslint-disable-next-line no-console
        console.warn(`[useFocusReport] fetch threw: ${msg}`);
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
