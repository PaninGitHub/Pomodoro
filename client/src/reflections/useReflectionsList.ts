import { useCallback, useEffect, useState } from 'react';
import type { ReflectionFilters, ReflectionRow } from './reflectionTypes';

interface UseReflectionsListResult {
  reflections: ReflectionRow[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Build the GET query string from filters. Empty / undefined filters are
// omitted entirely so the URL stays minimal and a 0-filter request looks
// like `/api/reflections` with no `?`.
function buildQueryString(filters: ReflectionFilters): string {
  const params = new URLSearchParams();
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (filters.focus_rating !== undefined) params.set('focus_rating', String(filters.focus_rating));
  if (filters.task_name && filters.task_name.length > 0) params.set('task_name', filters.task_name);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/**
 * Fetches the user's reflections list, scoped by the given filters.
 * Re-fetches whenever the filter object's contents change (the consumer
 * is responsible for stable referential identity — wrap in useMemo if
 * the filters object is rebuilt on every render).
 *
 * Debugging: all fetch failures log to console with a `[useReflectionsList]`
 * prefix so they're easy to grep in DevTools. The `error` field also
 * surfaces in the UI for end-user feedback. Cancellation guard prevents
 * stale fetches from updating state if the filters change mid-flight.
 */
export function useReflectionsList(filters: ReflectionFilters): UseReflectionsListResult {
  const [reflections, setReflections] = useState<ReflectionRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Stringify the filters into a stable dep so re-renders with a new
  // object identity but the same contents don't trigger redundant fetches.
  const filtersKey = JSON.stringify(filters);

  const refetch = useCallback(async () => {
    const qs = buildQueryString(filters);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reflections${qs}`, { credentials: 'include' });
      if (res.status !== 200) {
        const msg = `Server responded ${res.status}`;
        // eslint-disable-next-line no-console
        console.warn(`[useReflectionsList] fetch failed: ${msg}`);
        setError(msg);
        setReflections([]);
        return;
      }
      const body = (await res.json()) as { reflections: ReflectionRow[] };
      setReflections(body.reflections);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown fetch error';
      // eslint-disable-next-line no-console
      console.warn(`[useReflectionsList] fetch threw: ${msg}`);
      setError(msg);
      setReflections([]);
    } finally {
      setLoading(false);
    }
    // refetch is bound to current filters, not refreshed on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey]);

  useEffect(() => {
    // Cancellation flag against an auth/filters change mid-fetch — same
    // pattern as the ReflectionContext fetch guard.
    let cancelled = false;
    const qs = buildQueryString(filters);
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const res = await fetch(`/api/reflections${qs}`, { credentials: 'include' });
        if (cancelled) return;
        if (res.status !== 200) {
          const msg = `Server responded ${res.status}`;
          // eslint-disable-next-line no-console
          console.warn(`[useReflectionsList] fetch failed: ${msg}`);
          setError(msg);
          setReflections([]);
          return;
        }
        const body = (await res.json()) as { reflections: ReflectionRow[] };
        if (!cancelled) setReflections(body.reflections);
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : 'Unknown fetch error';
        // eslint-disable-next-line no-console
        console.warn(`[useReflectionsList] fetch threw: ${msg}`);
        setError(msg);
        setReflections([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // filtersKey captures filter content changes; the actual filter values
    // are read fresh inside the effect via closure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey]);

  return { reflections, loading, error, refetch };
}
